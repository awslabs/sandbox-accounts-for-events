import { configureStore } from '@reduxjs/toolkit'

import current_user from "./actions/current_user";
import aws_login from "./actions/aws_login";
import accounts from "./actions/accounts";
import events from "./actions/events";
import leases from "./actions/leases";
import users from "./actions/users";
import usage from "./actions/usage";
import config from "./actions/config";
import notification from "./actions/notification";
import logs from "./actions/logs";
import statistics from "./actions/statistics";
import selection from "./actions/selection";
import modal from "./actions/modal";

const store = configureStore({
    reducer: {
        current_user,
        accounts,
        events,
        leases,
        users,
        usage,
        config,
        notification,
        statistics,
        aws_login,
        logs,
        selection,
        modal
    }
});

export default store;
