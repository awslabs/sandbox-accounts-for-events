import Amplify, { Auth } from "aws-amplify";
import ReactDOM from "react-dom";
import { Button, Link, Header } from "@awsui/components-react";

import awsconfig from "./aws-exports";
import PubSub from "@aws-amplify/pubsub";

import { Provider } from "react-redux";
import { Route, Outlet, Navigate } from "react-router-dom";
import { Routes, HashRouter } from "react-router-dom";
import store from "./redux/store";

import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentUser } from "./redux/actions/current_user";
import { fetchConfig } from "./redux/actions/config";
import { TopNavigationi18nStrings } from "./pages/components/labels";
import ConfirmationModal from "./pages/modals/ConfirmationModal";

import Home from "./pages/Home";
import OverviewEvents from "./pages/OverviewEvents";
import OverviewUsers from "./pages/OverviewUsers";
import OverviewAccounts from "./pages/OverviewAccounts";
import OverviewLeases from "./pages/OverviewLeases";
import OverviewUsage from "./pages/OverviewUsage";
import DetailEvent from "./pages/DetailEvent";
import Statistics from "./pages/Statistics";
import AdminConfig from "./pages/AdminConfig";
import TopNavigation from "@awsui/components-react/top-navigation/1.0-beta";
import { useNavigate } from "react-router-dom";

Amplify.configure(awsconfig);
PubSub.configure(awsconfig);

const AuthContainer = ({ children }) => {
    const dispatch = useDispatch();

    useEffect(() => {
        Auth.currentAuthenticatedUser()
            .then((data) => {
                dispatch(setCurrentUser(data));
                dispatch(fetchConfig());
            })
            .catch((reason) => reason);
    }, [dispatch]);

    return children;
};

const TopNavigationBar = () => {
    const User = useSelector((state) => state.current_user);
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const deleteMe = () => {
        if (User.isAdmin) {
            dispatch({ type: "notification/error", message: "As an admin you cannot delete your own account." });
            return;
        }

        Auth.deleteUser()
            .then(() => {
                dispatch({ type: "current_user/clear" });
                navigate("/");
            })
            .catch((error) => {
                console.error("Error deleting user profile", error);
                dispatch({ type: "notification/error", message: "Error deleting your own user profile." });
            });
    };

    const signOut = () => {
        Auth.signOut().then(() => {
            dispatch({ type: "current_user/clear" });
            navigate("/");
        });
    };

    let utilities = [];
    if (User.isAdmin)
        utilities = utilities.concat({
            type: "menu-dropdown",
            iconName: "settings",
            ariaLabel: "Settings",
            title: "Settings",
            items: [
                {
                    text: "Configuration",
                    href: "#/config"
                }
            ]
        });

    utilities = utilities.concat({
        type: "menu-dropdown",
        iconName: "user-profile",
        text: User.email,
        items: [
            {
                items: [
                    {
                        text: (
                            <Link
                                onFollow={() =>
                                    User.isAdmin
                                        ? dispatch({ type: "modal/open", status: "cannotDeleteMyself" })
                                        : dispatch({ type: "modal/open", status: "deleteMyself" })
                                }
                            >
                                Delete my user profile
                            </Link>
                        )
                    }
                ]
            },
            {
                text: (
                    <Button variant="primary" onClick={signOut}>
                        Sign out
                    </Button>
                )
            }
        ]
    });

    return (
        <>
            <TopNavigation
                identity={{
                    href: "#",
                    title: "Sandbox Accounts for Events"
                }}
                utilities={utilities}
                i18nStrings={TopNavigationi18nStrings}
            />
            <ConfirmationModal
                visible={modal.status === "deleteMyself"}
                action={deleteMe}
                confirmationText="delete me"
                buttonText="Delete your account"
                alert="error"
            >
                Do you really want to delete your user account "{User.email}"?
                <br />
                <strong>You will not be able to log in to Sandbox Accounts for Events any more!</strong>
            </ConfirmationModal>
            <ConfirmationModal
                visible={modal.status === "cannotDeleteMyself"}
                action={() => undefined}
                buttonText="Ok"
                alert="error"
                header={<Header>Error</Header>}
            >
                Sorry, but for security reasons admins cannot delete their own user accounts.
            </ConfirmationModal>
        </>
    );
};

const PrivateOutlet = ({ groupName }) => {
    const User = useSelector((state) => state.current_user);
    return User[groupName] ? <Outlet /> : <Navigate to="/" />;
};

const HeaderPortal = ({ children }) => {
    const domNode = document.querySelector("#top-navigation");
    return ReactDOM.createPortal(children, domNode);
};

const App = () => {
    return (
        <Provider store={store}>
            <AuthContainer>
                <HashRouter>
                    <HeaderPortal>
                        <TopNavigationBar />
                    </HeaderPortal>
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
                </HashRouter>
            </AuthContainer>
        </Provider>
    );
};

export default App;
