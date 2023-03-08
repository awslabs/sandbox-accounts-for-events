import { API } from "@aws-amplify/api";
import { Auth } from "aws-amplify";
import moment from "moment";
import { autoDismiss } from "./notification";

const initialState = {
    status: "idle",
    items: [],
    nextToken: undefined
};

const users = (state = initialState, action) => {
    const convertItem = (item) => ({
        ...item,
        id: item.Username,
        email: item.Attributes.find((attribute) => attribute.Name === "email").Value,
        status: item.UserStatus,
        createdDate: moment(item.UserCreateDate).format(action.config.FORMAT_DATETIME),
        lastModifiedDate: moment(item.UserLastModifiedDate).format(action.config.FORMAT_DATETIME)
    });

    switch (action.type) {
        case "users/loading":
            return {
                ...state,
                status: "loading"
            };
        case "users/loadingAll":
            return {
                ...state,
                status: "loadingAll"
            };
        case "users/loaded":
            const newUsers = action.payload.map((item) => convertItem(item));
            return {
                ...state,
                status: "idle",
                items: action.addUsers ? state.items.concat(newUsers) : newUsers,
                nextToken: action.nextToken
            };
        case "user/updated":
            return {
                ...state,
                items: state.items.map((item) =>
                    item.email === action.payload.email
                        ? convertItem({
                              ...item,
                              ...action.payload
                          })
                        : item
                )
            };
        case "users/delete":
            return {
                ...state,
                items: state.items.filter(
                    (item) =>
                        !action.payload.some(
                            (promise) => promise.status === "fulfilled" && item.id === promise.value.id
                        )
                )
            };
        case "user/create":
            return {
                ...state,
                items: state.items.concat(convertItem(action.payload))
            };
        case "users/loadFailed":
        case "user/updateFailed":
            return {
                ...state,
                status: "idle"
            };
        default:
            return state;
    }
};

export const fetchUsers =
    (showStatus = true, requiredUsers = 0) =>
    async (dispatch, getState) => {
        try {
            const config = getState().config;
            const existingUsers = getState().users;
            if (showStatus) dispatch({ type: "users/loading" });
            if (requiredUsers >= Number.MAX_SAFE_INTEGER) dispatch({ type: "users/loadingAll" });
            const jwtToken = (await Auth.currentSession()).getAccessToken().getJwtToken();
            let items = [];
            let nextToken = existingUsers.nextToken;

            const response = await Promise.all([
                API.get("AdminQueries", "/listUsers", {
                    queryStringParameters: {
                        limit: config.USER_LIST_BATCH_SIZE,
                        token: requiredUsers > 0 ? nextToken : undefined
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: jwtToken
                    }
                }),
                API.get("AdminQueries", "/listUsersInGroup", {
                    queryStringParameters: {
                        groupname: config.OPERATOR_GROUP,
                        limit: config.USER_LIST_BATCH_SIZE
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: jwtToken
                    }
                }),
                API.get("AdminQueries", "/listUsersInGroup", {
                    queryStringParameters: {
                        groupname: config.ADMIN_GROUP,
                        limit: config.USER_LIST_BATCH_SIZE
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: jwtToken
                    }
                })
            ]);
            if (response && Array.isArray(response) && response.length === 3) {
                nextToken = response[0].NextToken;
                items = items.concat(response[0].Users);
                while (nextToken && items.length < requiredUsers) {
                    const nextResponse = await API.get("AdminQueries", "/listUsers", {
                        queryStringParameters: {
                            limit: config.USER_LIST_BATCH_SIZE,
                            token: nextToken
                        },
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: jwtToken
                        }
                    });
                    items = items.concat(nextResponse.Users);
                    nextToken = nextResponse.NextToken;
                }
                items = items.map((item) => ({
                    ...item,
                    isOperator: false,
                    isAdmin: false
                }));
                response[1].Users.forEach((operator) => {
                    let idx = items.findIndex((user) => user.Username === operator.Username);
                    if (idx !== -1) {
                        items[idx].isOperator = true;
                    }
                });
                response[2].Users.forEach((admin) => {
                    let idx = items.findIndex((user) => user.Username === admin.Username);
                    if (idx !== -1) {
                        items[idx].isAdmin = true;
                    }
                });
            }
            dispatch({ type: "users/loaded", payload: items, addUsers: requiredUsers !== 0, nextToken, config });
        } catch (error) {
            console.error(error);
            dispatch({ type: "users/loadFailed" });
            dispatch({ type: "notification/error", message: "Error trying to load user list." });
        }
    };

export const updateUser =
    ({ id, email, isOperator, isAdmin }) =>
    async (dispatch, getState) => {
        if (email === getState().current_user.email && isAdmin === false) {
            dispatch({ type: "notification/error", message: "You cannot remove Admin rights from your own account." });
            return;
        }
        try {
            const config = getState().config;
            const jwtToken = (await Auth.currentSession()).getAccessToken().getJwtToken();

            await Promise.all([
                API.post("AdminQueries", isOperator ? "/addUserToGroup" : "/removeUserFromGroup", {
                    body: {
                        username: id,
                        groupname: config.OPERATOR_GROUP
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: jwtToken
                    }
                }),
                API.post("AdminQueries", isAdmin ? "/addUserToGroup" : "/removeUserFromGroup", {
                    body: {
                        username: id,
                        groupname: config.ADMIN_GROUP
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: jwtToken
                    }
                })
            ]);
            dispatch({ type: "user/updated", payload: { id, email, isOperator, isAdmin }, config: getState().config });
            dispatch(
                autoDismiss({ type: "notification/success", message: "User " + email + " successfully updated." })
            );
        } catch (error) {
            console.error(error);
            dispatch({ type: "user/updateFailed" });
            dispatch({ type: "notification/error", message: "Error updating user " + email + "." });
        }
    };

export const deleteUsers = (items) => async (dispatch, getState) => {
    if (items.some((user) => user.email === getState().current_user.email)) {
        dispatch({ type: "notification/error", message: "You cannot delete your own user account." });
        return;
    }
    try {
        const jwtToken = (await Auth.currentSession()).getAccessToken().getJwtToken();
        const response = await Promise.allSettled(
            items.map(({ id }) =>
                API.post("AdminQueries", "/deleteUser", {
                    body: {
                        username: id
                    },
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: jwtToken
                    }
                }).then(() => ({ id }))
            )
        );
        dispatch({ type: "users/delete", payload: response });
        let rejectedPromises = response.filter((promise) => promise.status === "rejected");
        let errors = rejectedPromises.length;
        if (errors === 0) {
            dispatch(
                autoDismiss({
                    type: "notification/success",
                    message: items.length + " user" + (items.length > 1 ? "s" : "") + " successfully deleted."
                })
            );
        } else {
            console.error(rejectedPromises);
            dispatch({
                type: "notification/error",
                message:
                    "Failed to delete " +
                    errors +
                    " user" +
                    (errors > 1 ? "s" : "") +
                    ". (" +
                    (response.length - errors) +
                    " users successfully deleted.)"
            });
        }
    } catch (error) {
        console.error(error);
        dispatch({
            type: "notification/error",
            message: "Failed to delete user" + (items.length > 1 ? "s" : "") + "."
        });
    }
};

export const createUser =
    ({ email, isOperator, isAdmin }) =>
    async (dispatch, getState) => {
        try {
            const config = getState().config;
            const jwtToken = (await Auth.currentSession()).getAccessToken().getJwtToken();
            const response = await API.post("AdminQueries", "/createUser", {
                body: {
                    username: email
                },
                headers: {
                    "Content-Type": "application/json",
                    Authorization: jwtToken
                }
            });

            const promises = [];
            if (isOperator)
                promises.push(
                    API.post("AdminQueries", "/addUserToGroup", {
                        body: {
                            username: email,
                            groupname: config.OPERATOR_GROUP
                        },
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: jwtToken
                        }
                    })
                );
            if (isAdmin)
                promises.push(
                    API.post("AdminQueries", "/addUserToGroup", {
                        body: {
                            username: email,
                            groupname: config.ADMIN_GROUP
                        },
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: jwtToken
                        }
                    })
                );
            await Promise.all(promises);
            dispatch({
                type: "user/create",
                payload: {
                    ...response.User,
                    isOperator: isOperator,
                    isAdmin: isAdmin
                },
                config
            });
            dispatch(
                autoDismiss({ type: "notification/success", message: "User " + email + " successfully created." })
            );
        } catch (error) {
            console.error(error);
            dispatch({ type: "notification/error", message: "Failed to create user " + email + "." });
        }
    };

export default users;
