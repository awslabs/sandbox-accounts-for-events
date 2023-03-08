import { API, graphqlOperation } from "@aws-amplify/api";
import * as queries from "../../graphql/queries";
import moment from "moment";
import { autoDismiss } from "./notification";

const initialState = {
    status: "idle",
    items: [],
    rolePolicy: "loading..."
};

const accounts = (state = initialState, action) => {
    const toRoleName = (roleArn) => {
        let parts = roleArn.split("/");
        if (parts && parts.length > 1) return parts[1];
        else return "";
    };

    const convertItem = (item) => ({
        ...item,
        adminRoleName: toRoleName(item.adminRoleArn),
        principalRoleName: toRoleName(item.principalRoleArn),
        createdDate: moment.unix(item.createdOn).format(action.config.FORMAT_DATETIME),
        lastModifiedDate: moment.unix(item.lastModifiedOn).format(action.config.FORMAT_DATETIME)
    });

    switch (action.type) {
        case "accounts/loading":
            return {
                ...state,
                status: "loading"
            };
        case "accounts/loaded":
            return {
                ...state,
                status: "idle",
                items: action.payload.map((item) => convertItem(item)),
                rolePolicy:
                    "{\n" +
                    '    "Version": "2012-10-17",\n' +
                    '    "Statement": [\n' +
                    "        {\n" +
                    '            "Effect": "Allow",\n' +
                    '            "Principal": {\n' +
                    '                "AWS": "arn:aws:iam::' +
                    action.masterAccountId +
                    ':root"\n' +
                    "            },\n" +
                    '            "Action": "sts:AssumeRole",\n' +
                    '            "Condition": {}\n' +
                    "        },\n" +
                    "    ]\n" +
                    "}"
            };
        case "account/updated":
            return {
                ...state,
                status: "idle",
                items: state.items.map((item) =>
                    item.id === action.payload.id
                        ? convertItem({
                              ...item,
                              ...action.payload
                          })
                        : item
                )
            };
        case "accounts/remove":
            return {
                ...state,
                status: "idle",
                items: state.items.filter(
                    (item) =>
                        !action.payload.some(
                            (promise) => promise.status === "fulfilled" && item.id === promise.value.id
                        )
                )
            };
        case "accounts/register":
            return {
                ...state,
                status: "idle",
                items: state.items.concat(
                    action.payload
                        .filter((promise) => promise.status === "fulfilled")
                        .map((item) => convertItem(item.value))
                )
            };
        case "accounts/loadFailed":
        case "account/updateFailed":
            return {
                ...state,
                status: "idle"
            };
        default:
            return state;
    }
};

export const fetchAccounts =
    (showStatus = true) =>
    async (dispatch, getState) => {
        try {
            if (showStatus) dispatch({ type: "accounts/loading" });
            const response = await API.graphql(graphqlOperation(queries.safeAdminApi, { action: "listAccounts" }));
            const payload = JSON.parse(response.data.safeAdminApi);
            let items = [];
            if (!payload || payload.status === "error") {
                throw payload;
            }
            if (payload.status === "success") {
                items = payload.body.accounts;
            }
            dispatch({
                type: "accounts/loaded",
                payload: items,
                config: getState().config,
                masterAccountId: payload.body.masterAccountId
            });
        } catch (error) {
            console.error(error);
            dispatch({ type: "accounts/loadFailed" });
            dispatch({ type: "notification/error", message: "Error loading account list." });
        }
    };

export const updateAccount =
    ({ id, accountStatus, adminRoleArn }) =>
    async (dispatch, getState) => {
        try {
            const response = await API.graphql(
                graphqlOperation(queries.safeAdminApi, {
                    action: "updateAccount",
                    paramJson: JSON.stringify({ id, accountStatus, adminRoleArn })
                })
            );
            const payload = JSON.parse(response.data.safeAdminApi);
            if (!payload || payload.status === "error") {
                throw payload;
            }
            dispatch({
                type: "account/updated",
                payload: { id, accountStatus, adminRoleArn },
                config: getState().config
            });
            dispatch(
                autoDismiss({
                    type: "notification/success",
                    message: "DynamoDB entry for AWS account " + id + " successfully updated."
                })
            );
        } catch (error) {
            console.error(error);
            dispatch({ type: "account/updateFailed" });
            dispatch({ type: "notification/error", message: "Error updating AWS account " + id + "." });
        }
    };

export const removeAccounts = (items) => async (dispatch) => {
    try {
        if (!items.reduce((total, item) => total && item.accountStatus === "Ready", true)) {
            dispatch({ type: "notification/error", message: "Can only remove accounts in 'Ready' state." });
            return;
        }
        const response = await Promise.allSettled(
            items.map(({ id }) =>
                API.graphql(
                    graphqlOperation(queries.safeAdminApi, {
                        action: "removeAccount",
                        paramJson: JSON.stringify({
                            id
                        })
                    })
                ).then((response) => {
                    const payload = JSON.parse(response.data.safeAdminApi);
                    if (!payload || payload.status === "error") {
                        throw payload;
                    }
                    return { id };
                })
            )
        );
        dispatch({ type: "accounts/remove", payload: response });
        let rejectedPromises = response.filter((promise) => promise.status === "rejected");
        let errors = rejectedPromises.length;
        if (errors === 0) {
            dispatch(
                autoDismiss({
                    type: "notification/success",
                    message: items.length + " account" + (items.length > 1 ? "s" : "") + " successfully removed."
                })
            );
        } else {
            console.error(rejectedPromises);
            dispatch({
                type: "notification/error",
                message:
                    "Failed to remove " +
                    errors +
                    " account" +
                    (errors > 1 ? "s" : "") +
                    ". (" +
                    (response.length - errors) +
                    " accounts successfully removed.)"
            });
        }
    } catch (error) {
        console.error(error);
        dispatch({
            type: "notification/error",
            message: "Failed to remove account" + (items.length > 1 ? "s" : "") + "."
        });
    }
};

export const registerAccounts =
    ({ accountIds, roleName }) =>
    async (dispatch, getState) => {
        try {
            const progressStep = Math.floor(100 / accountIds.length);
            let progress = 0;
            dispatch({ type: "logs/clear" });
            dispatch({
                type: "notification/withProgressBar",
                header: "Registering AWS accounts...",
                message: "Registering " + accountIds.length + " account" + (accountIds.length > 1 ? "s" : ""),
                hasAction: true
            });
            const response = await Promise.allSettled(
                accountIds.map(
                    (id) =>
                        new Promise((resolve, reject) => {
                            dispatch({
                                type: "logs/addEntry",
                                payload: {
                                    id: id,
                                    status: "in-progress",
                                    text: "Registering account " + id
                                }
                            });
                            API.graphql(
                                graphqlOperation(queries.safeAdminApi, {
                                    action: "registerAccount",
                                    paramJson: JSON.stringify({
                                        id,
                                        roleName
                                    })
                                })
                            )
                                .then((response) => {
                                    const payload = JSON.parse(response.data.safeAdminApi);
                                    if (!payload || payload.status === "error") {
                                        throw payload;
                                    }
                                    dispatch({
                                        type: "logs/addEntry",
                                        payload: {
                                            id: id,
                                            status: "success",
                                            text: "finished."
                                        }
                                    });
                                    dispatch({
                                        type: "notification/withProgressBar",
                                        header: "Registering AWS accounts...",
                                        message:
                                            "Registering " +
                                            accountIds.length +
                                            " account" +
                                            (accountIds.length > 1 ? "s" : ""),
                                        progressPercent: (progress += progressStep),
                                        hasAction: true
                                    });
                                    resolve(payload.body);
                                })
                                .catch((error) => {
                                    let errorText = "Error executing";
                                    if (error && error.message) errorText = error.message;
                                    dispatch({
                                        type: "logs/addEntry",
                                        payload: {
                                            id: id,
                                            status: "error",
                                            text: errorText
                                        }
                                    });
                                    dispatch({
                                        type: "notification/withProgressBar",
                                        header: "Registering AWS accounts...",
                                        message:
                                            "Registering " +
                                            accountIds.length +
                                            " account" +
                                            (accountIds.length > 1 ? "s" : ""),
                                        progressPercent: (progress += progressStep),
                                        hasAction: true
                                    });
                                    reject(error);
                                });
                        })
                )
            );
            dispatch({ type: "accounts/register", payload: response, config: getState().config });
            let rejectedPromises = response.filter((promise) => promise.status === "rejected");
            let errors = rejectedPromises.length;
            if (errors === 0) {
                dispatch(
                    autoDismiss({
                        type: "notification/success",
                        message:
                            accountIds.length +
                            " account" +
                            (accountIds.length > 1 ? "s" : "") +
                            " successfully registered.",
                        hasAction: true
                    })
                );
            } else {
                console.error(rejectedPromises);
                dispatch({
                    type: "notification/error",
                    message:
                        "Failed to register " +
                        errors +
                        " account" +
                        (errors > 1 ? "s" : "") +
                        ". (" +
                        (response.length - errors) +
                        " accounts successfully registered.)",
                    hasAction: true
                });
            }
        } catch (error) {
            console.error(error);
            dispatch({
                type: "notification/error",
                message: "Failed to register account" + (accountIds.length > 1 ? "s" : "") + ".",
                hasAction: true
            });
        }
    };

export default accounts;
