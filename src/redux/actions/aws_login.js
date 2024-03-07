import { API, graphqlOperation } from "@aws-amplify/api";
import * as queries from "../../graphql/queries";

const initialState = {
    status: "hidden",
    event_status: "idle",
    url: "",
    credentials: "",
    event: {}
};

const aws_login = (state = initialState, action) => {
    switch (action.type) {
        case "aws_login/loading":
            return {
                ...state,
                status: "loading"
            };
        case "aws_login/loaded":
            return {
                ...state,
                status: "visible",
                url: action.payload.consoleUrl,
                credentials: "export AWS_ACCESS_KEY_ID=" + action.payload.accessKeyId + "\n" +
                             "export AWS_SECRET_ACCESS_KEY=" + action.payload.secretAccessKey + "\n" +
                             "export AWS_SESSION_TOKEN=" + action.payload.sessionToken + "\n"
            };
        case "aws_login/loadError":
        case "aws_login/dismiss":
            return {
                ...state,
                url: "",
                credentials: "",
                status: "hidden"
            };
                
        case "aws_login/event_loading":
            return {
                ...state,
                event_status: "loading"
            };
        case "aws_login/event_loaded":
            return {
                ...state,
                event_status: "idle",
                event: action.payload
            };
        case "aws_login/event_loadError":
        case "aws_login/event_dismiss":
            return initialState;
        default:
            return state;
    }
};

export const fetchAwsLoginUrl = (params) => async (dispatch) => {
    try {
        const loginType = params.id ? "getAwsLoginUrlForLease" : "getAwsLoginUrlForEvent";
        dispatch({ type: "aws_login/loading" });
        const response = await API.graphql(
            graphqlOperation(queries.safeLoginApi, {
                action: loginType,
                paramJson: JSON.stringify(params)
            })
        );
        const payload = JSON.parse(response.data.safeLoginApi);
        if (!payload || payload.status === "error") {
            throw payload;
        }
        dispatch({ type: "aws_login/loaded", payload: payload.body });
        dispatch({ type: "notification/dismiss" });
    } catch (error) {
        console.error(error);
        dispatch({ type: "aws_login/loadError" });
        dispatch({ type: "notification/error", message: error.message });
    }
};

export const getEndUserEvent = (id) => async (dispatch) => {
    dispatch({ type: "aws_login/event_loading" });
    try {
        const response = await API.graphql(
            graphqlOperation(queries.safeLoginApi, {
                action: "getEndUserEvent",
                paramJson: JSON.stringify({id})
            })
        );
        const payload = JSON.parse(response.data.safeLoginApi);
        if (!payload || payload.status === "error") {
            throw payload;
        }
        dispatch({ type: "aws_login/event_loaded", payload: payload.body });
        dispatch({ type: "notification/dismiss" });
    } catch (error) {
        console.error(error);
        dispatch({ type: "aws_login/event_loadError" });
        dispatch({ type: "notification/error", message: error.message });
    }
};


export default aws_login;
