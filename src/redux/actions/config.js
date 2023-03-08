import { API, graphqlOperation } from "@aws-amplify/api";
import * as queries from "../../graphql/queries";
import * as mutations from "../../graphql/mutations";

let initialState = {
    id: "default",
    EVENT_MAX_DAYS: 90,
    EVENT_MAX_ACCOUNTS: 50,
    ACCOUNT_MAX_BUDGET: 1000,
    BUDGET_CURRENCY: "USD",
    EVENT_DEFAULT_LENGTH_DAYS: 0,
    EVENT_DEFAULT_LENGTH_HOURS: 8,
    EVENT_DEFAULT_ACCOUNT_BUDGET: 10,
    EVENT_DEFAULT_ACCOUNTS: 5,
    EVENT_ID_LENGTH: 10,
    EVENT_PRINCIPAL_SEPARATOR: "__",
    EVENT_EMAIL_SUBST: "+",
    EMAIL_REGEX: "\\S+@\\S+\\.\\S+",
    LEASE_ID_REGEX: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}",
    ITEM_PAGE_SIZE: 20,
    SUBITEM_PAGE_SIZE: 10,
    ADMIN_GROUP: "admin",
    OPERATOR_GROUP: "operator",
    STATISTICS_DEFAULT_PRE_DAYS: 10,
    STATISTICS_DEFAULT_POST_DAYS: 15,
    STATISTICS_X_AXIS_DATE_FORMAT: "MM-DD",
    FORMAT_DATETIME: "YYYY-MM-DD, HH:mm",
    FORMAT_DATE: "YYYY-MM-DD",
    FORMAT_TIME: "HH:mm",
    UPDATE_WEBSITE_INTERVAL: 10,
    HIDE_NOTIFICATION_DURATION: 10,
    USER_LIST_BATCH_SIZE: 60,
    DISPLAY_THEME: "Light",
    DISPLAY_TEXT_MODE: "Comfortable"
};
initialState = {
    ...initialState,
    EVENT_ID_REGEX: "[a-zA-Z0-9]{" + initialState.EVENT_ID_LENGTH + "}"
};

const config = (state = initialState, action) => {
    switch (action.type) {
        case "config/loaded":
            return action.payload;
        case "config/updated":
            return {
                ...state,
                ...action.payload,
                id: "saved"
            };
        case "config/resetToDefaults":
            return initialState;
        default:
            return state;
    }
};

export const fetchConfig = () => async (dispatch) => {
    try {
        const response = await API.graphql(graphqlOperation(queries.listConfigs));
        const configItems = response.data.listConfigs.items;
        if (configItems.length > 0) dispatch({ type: "config/loaded", payload: JSON.parse(configItems[0].config) });
        else console.warn("No data found in SAfE configuration database, using default settings");
    } catch (error) {
        console.error("Error loading configuration settings, using defaults instead.", error);
    }
};

export const updateConfig = (config) => async (dispatch, getState) => {
    try {
        let input = {
            id: "saved",
            config: JSON.stringify({
                ...config,
                id: "saved"
            })
        };
        try {
            await API.graphql(graphqlOperation(mutations.updateConfig, { input }));
        } catch {
            await API.graphql(graphqlOperation(mutations.createConfig, { input }));
        }
        dispatch({ type: "config/updated", payload: config });
        dispatch({ type: "notification/success", message: "Successfully updated configuration settings." });
    } catch (error) {
        console.error(error);
        dispatch({ type: "notification/error", message: "Error updating configuration settings." });
    }
};

export default config;
