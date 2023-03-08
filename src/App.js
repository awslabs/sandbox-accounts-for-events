import { Amplify } from "aws-amplify";
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react';

import awsconfig from "./aws-exports";
import { PubSub }  from "@aws-amplify/pubsub";

import { Provider, useDispatch, useSelector } from "react-redux";
import { Route, Outlet, Navigate, Routes, HashRouter } from "react-router-dom";
import store from "./redux/store";

import React, { useEffect } from "react";
import { setCurrentUser } from "./redux/actions/current_user";
import { fetchConfig } from "./redux/actions/config";

import { Box } from "@cloudscape-design/components";
import TopMenuBar from "./pages/components/TopMenuBar";
import Home from "./pages/Home";
import OverviewEvents from "./pages/OverviewEvents";
import OverviewUsers from "./pages/OverviewUsers";
import OverviewAccounts from "./pages/OverviewAccounts";
import OverviewLeases from "./pages/OverviewLeases";
import OverviewUsage from "./pages/OverviewUsage";
import DetailEvent from "./pages/DetailEvent";
import Statistics from "./pages/Statistics";
import AdminConfig from "./pages/AdminConfig";
import { applyMode, applyDensity, Density, Mode } from '@cloudscape-design/global-styles';

Amplify.configure(awsconfig);
PubSub.configure(awsconfig);

const AuthContainer = ({ children }) => {
    const dispatch = useDispatch();
    const config = useSelector((state) => state.config)
    const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);

    useEffect(() => {
        applyMode(Mode[config.DISPLAY_THEME])
        applyDensity(Density[config.DISPLAY_TEXT_MODE])
    },[config])

    useEffect(() => {
        if (authStatus === "authenticated") {
            dispatch(setCurrentUser(user));
            dispatch(fetchConfig());
        }
    }, [dispatch, user, authStatus]);

    return children;
};

const PrivateOutlet = ({ groupName }) => {
    const User = useSelector((state) => state.current_user);
    return User[groupName] ? <Outlet /> : <Navigate to="/" />;
};

const App = () => {
    return (
        <Provider store={store}>
            <Authenticator.Provider>
                <AuthContainer>
                    <HashRouter>
                        <TopMenuBar />
                        <Box className="content-frame">
                            <Routes>
                                <Route exact path="/" element={<Home />} />
                                <Route exact path="/login/:urlParamEventId" element={<Home />} />
                                <Route path="/events" element={<PrivateOutlet groupName="isOperator" />}>
                                    <Route path="" element={<OverviewEvents />} />
                                    <Route path="statistics" element={<Statistics />} />
                                    <Route path=":urlParamEventId" element={<DetailEvent />} />
                                </Route>
                                <Route path="/usage" element={<PrivateOutlet groupName="isOperator" />}>
                                    <Route path="" element={<OverviewUsage />} />
                                </Route>
                                <Route path="/users" element={<PrivateOutlet groupName="isAdmin" />}>
                                    <Route path="" element={<OverviewUsers />} />
                                    <Route path=":urlParamUserId" element={<OverviewUsers />} />
                                </Route>
                                <Route path="/leases" element={<PrivateOutlet groupName="isAdmin" />}>
                                    <Route path="" element={<OverviewLeases />} />
                                    <Route path=":urlParamLeaseId" element={<OverviewLeases />} />
                                </Route>
                                <Route path="/accounts" element={<PrivateOutlet groupName="isAdmin" />}>
                                    <Route path="" element={<OverviewAccounts />} />
                                    <Route path=":urlParamAccountId" element={<OverviewAccounts />} />
                                </Route>
                                <Route path="/config" element={<PrivateOutlet groupName="isAdmin" />}>
                                    <Route path="" element={<AdminConfig />} />
                                </Route>
                                <Route path="*" element={<Navigate to="/" />} />
                            </Routes>
                        </Box>
                    </HashRouter>
                </AuthContainer>
            </Authenticator.Provider>
        </Provider>
    );
};

export default App;
