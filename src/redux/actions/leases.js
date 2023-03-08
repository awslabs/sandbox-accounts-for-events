import { API, graphqlOperation } from "@aws-amplify/api";
import * as queries from "../../graphql/queries";
import moment from "moment";
import { autoDismiss } from "./notification";

const initialState = {
    status: "idle",
    items: []
};

const leases = (state = initialState, action) => {
    const convertItem = (item) => {
        let spendAmount = item.spendAmount ?? 0;
        if (typeof spendAmount !== "string") spendAmount = spendAmount.toFixed(2);
        let principalIdParts = item.principalId.match(
            new RegExp("^(" + action.config.EVENT_ID_REGEX + ")" + action.config.EVENT_PRINCIPAL_SEPARATOR + "\\S{5,}$")
        );

        return {
            ...item,
            eventId: principalIdParts ? principalIdParts[1] : "",
            createdDate: moment.unix(item.createdOn).format(action.config.FORMAT_DATETIME),
            expiresDate: moment.unix(item.expiresOn).format(action.config.FORMAT_DATETIME),
            lastModifiedDate: moment.unix(item.lastModifiedOn).format(action.config.FORMAT_DATETIME),
            leaseStatusModifiedDate: moment.unix(item.leaseStatusModifiedOn).format(action.config.FORMAT_DATETIME),
            user: item.budgetNotificationEmails.length > 0 ? item.budgetNotificationEmails[0] : "",
            spendAmount,
            spendPercent: Math.ceil((spendAmount / item.budgetAmount) * 100),
            expiresPercent:
                item.leaseStatus === "Active"
                    ? Math.ceil(((moment().unix() - item.createdOn) / (item.expiresOn - item.createdOn)) * 100)
                    : Math.ceil(
                          ((moment().unix() - item.createdOn) / (item.leaseStatusModifiedOn - item.createdOn)) * 100
                      )
        };
    };

    switch (action.type) {
        case "leases/loading":
            return {
                ...state,
                status: "loading"
            };
        case "leases/loaded":
            return {
                status: "idle",
                items: action.payload.map((item) => convertItem(item))
            };
        case "lease/updated":
            return {
                status: "idle",
                items: state.items.map((item) =>
                    item.principalId === action.payload.principalId && item.accountId === action.payload.accountId
                        ? convertItem({
                              ...item,
                              ...action.payload
                          })
                        : item
                )
            };
        case "lease/delete":
            return {
                status: "idle",
                items: state.items.filter(
                    (item) =>
                        item.principalId !== action.payload.principalId || item.accountId !== action.payload.accountId
                )
            };
        case "leases/terminate":
            return {
                status: "idle",
                items: state.items.map((item) => {
                    let foundPromise = action.payload.find(
                        (promise) =>
                            promise.status === "fulfilled" &&
                            item.principalId === promise.value.principalId &&
                            item.accountId === promise.value.accountId
                    );
                    if (foundPromise)
                        return {
                            ...item,
                            ...foundPromise.value
                        };
                    else return item;
                })
            };
        case "lease/create":
            return {
                status: "idle",
                items: state.items.concat(convertItem(action.payload))
            };
        case "leases/loadFailed":
        case "lease/updateFailed":
            return {
                ...state,
                status: "idle"
            };
        default:
            return state;
    }
};

export const fetchLeases =
    (showStatus = true) =>
    async (dispatch, getState) => {
        try {
            if (showStatus) dispatch({ type: "leases/loading" });
            const response = await API.graphql(graphqlOperation(queries.safeOperatorApi, { action: "listLeases" }));
            const payload = JSON.parse(response.data.safeOperatorApi);
            let items = [];
            if (!payload || payload.status === "error") {
                throw payload;
            }
            if (payload.status === "success") {
                items = payload.body.leases;
            }
            dispatch({ type: "leases/loaded", payload: items, config: getState().config });
        } catch (error) {
            console.error(error);
            dispatch({ type: "leases/loadFailed" });
            dispatch({ type: "notification/error", message: "Error loading leases list." });
        }
    };

export const updateLease =
    ({
        accountId,
        leaseStatus,
        leaseStatusReason,
        budgetAmount,
        expiresOn,
        principalId,
        budgetNotificationEmails,
        user
    }) =>
    async (dispatch, getState) => {
        try {
            const response = await API.graphql(
                graphqlOperation(queries.safeOperatorApi, {
                    action: "updateLease",
                    paramJson: JSON.stringify({
                        leaseStatus,
                        leaseStatusReason,
                        budgetAmount: parseInt(budgetAmount),
                        expiresOn,
                        principalId,
                        budgetNotificationEmails,
                        accountId,
                        user
                    })
                })
            );
            const payload = JSON.parse(response.data.safeOperatorApi);
            if (!payload || payload.status === "error") {
                throw payload;
            }
            dispatch({
                type: "lease/updated",
                payload: {
                    accountId,
                    leaseStatus,
                    leaseStatusReason,
                    budgetAmount,
                    expiresOn,
                    principalId,
                    budgetNotificationEmails,
                    user
                },
                config: getState().config
            });
            dispatch(
                autoDismiss({
                    type: "notification/success",
                    message: "DynamoDB entry for lease for user " + user + " successfully updated."
                })
            );
        } catch (error) {
            console.error(error);
            dispatch({ type: "lease/updateFailed" });
            dispatch({ type: "notification/error", message: "Error updating lease for user " + user + "." });
        }
    };

export const deleteLease =
    ({ principalId, accountId, user, leaseStatus }) =>
    async (dispatch) => {
        try {
            if (leaseStatus === "Active") {
                dispatch({ type: "notification/error", message: "Can only delete leases in 'Inactive' state." });
                return;
            }

            await API.graphql(
                graphqlOperation(queries.safeOperatorApi, {
                    action: "deleteLease",
                    paramJson: JSON.stringify({
                        principalId,
                        accountId,
                        user
                    })
                })
            ).then((response) => {
                const payload = JSON.parse(response.data.safeOperatorApi);
                if (!payload || payload.status === "error") {
                    throw payload;
                }
            });
            dispatch({ type: "lease/delete", payload: { principalId, accountId } });
            dispatch(
                autoDismiss({
                    type: "notification/success",
                    message: "Lease for user " + user + " successfully deleted."
                })
            );
        } catch (error) {
            console.error(error);
            dispatch({ type: "notification/error", message: "Error deleting lease for user " + user + "." });
        }
    };

export const terminateLeases = (items) => async (dispatch) => {
    try {
        if (items.some((item) => item.leaseStatus !== "Active")) {
            dispatch({ type: "notification/error", message: "Can only terminate leases in 'Active' state." });
            return;
        }
        const response = await Promise.allSettled(
            items.map(({ principalId, accountId, user }) =>
                API.graphql(
                    graphqlOperation(queries.safeOperatorApi, {
                        action: "terminateLease",
                        paramJson: JSON.stringify({
                            principalId,
                            accountId,
                            user
                        })
                    })
                ).then((response) => {
                    const payload = JSON.parse(response.data.safeOperatorApi);
                    if (!payload || payload.status === "error") {
                        throw payload;
                    }
                    return payload.body;
                })
            )
        );
        dispatch({ type: "leases/terminate", payload: response });
        let rejectedPromises = response.filter((promise) => promise.status === "rejected");
        let errors = rejectedPromises.length;
        if (errors === 0) {
            dispatch(
                autoDismiss({
                    type: "notification/success",
                    message: items.length + " lease" + (items.length > 1 ? "s" : "") + " successfully terminated."
                })
            );
        } else {
            console.error(rejectedPromises);
            dispatch({
                type: "notification/error",
                message:
                    "Failed to terminate " +
                    errors +
                    " lease" +
                    (errors > 1 ? "s" : "") +
                    ". (" +
                    (response.length - errors) +
                    " leases successfully terminated.)"
            });
        }
    } catch (error) {
        console.error(error);
        dispatch({ type: "notification/error", message: "Error terminating leases." });
    }
};

export const createLease =
    ({ budgetAmount, expiresOn, principalId, budgetNotificationEmails, user }) =>
    async (dispatch, getState) => {
        try {
            const config = getState().config;
            const response = await API.graphql(
                graphqlOperation(queries.safeOperatorApi, {
                    action: "createLease",
                    paramJson: JSON.stringify({
                        budgetAmount: parseInt(budgetAmount),
                        expiresOn,
                        principalId,
                        budgetNotificationEmails,
                        user,
                        budgetCurrency: config.BUDGET_CURRENCY
                    })
                })
            ).then((response) => {
                const payload = JSON.parse(response.data.safeOperatorApi);
                if (!payload || payload.status === "error") {
                    throw payload;
                }
                return payload;
            });
            dispatch({ type: "lease/create", payload: response.body, config });
            dispatch(
                autoDismiss({
                    type: "notification/success",
                    message: "Lease for user " + user + " successfully created."
                })
            );
        } catch (error) {
            console.error(error);
            dispatch({
                type: "notification/error",
                message: "Failed to create lease for user " + user + ": " + error.message
            });
        }
    };

export default leases;
