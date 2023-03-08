import React, { useEffect, useState } from "react";
import { AppLayout, Grid, Box, Header, HelpPanel, Button, Cards, SpaceBetween } from "@cloudscape-design/components";
import { useSelector, useDispatch } from "react-redux";
import Navigation from "./components/Navigation";
import { appLayoutLabels, itemSelectionLabels } from "./components/labels";
import "../styles/home-page.scss";
import { Authenticator } from "@aws-amplify/ui-react";
import '@aws-amplify/ui-react/styles.css';
import EventLogin from "./components/EventLogin";
import LeaseLogin from "./components/LeaseLogin";
import { useParams } from "react-router";
import { regExpAll } from "./components/utils";
import GitHubLinks from "./components/GitHubLinks";

const Content = () => {
    const LOGIN_TYPE_NONE = "LOGIN_TYPE_NONE";
    const LOGIN_TYPE_CREATE = "LOGIN_TYPE_CREATE";
    const LOGIN_TYPE_LOGIN = "LOGIN_TYPE_LOGIN";

    const User = useSelector((state) => state.current_user);
    const Config = useSelector((state) => state.config);
    const [LoginType, setLoginType] = useState(LOGIN_TYPE_NONE);
    const { urlParamEventId } = useParams();

    const LoginOptions = () => (
        <Cards
            ariaLabels={itemSelectionLabels}
            cardDefinition={{
                header: (item) => item.name,
                sections: [
                    {
                        id: "description",
                        content: (item) => item.description
                    },
                    {
                        id: "button",
                        content: (item) => (
                            <Button variant="primary" onClick={() => setLoginType(item.login)}>
                                {item.button}
                            </Button>
                        )
                    }
                ]
            }}
            cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 2 }]}
            items={[
                {
                    name: "Create a new user account",
                    button: "Create new account",
                    description:
                        "Use this option if you are here for the first time. After you have created a user account, we will be able to assign an AWS account to you.",
                    login: LOGIN_TYPE_CREATE
                },
                {
                    name: "Re-login with an existing user account",
                    button: "Login to existing account",
                    description:
                        "You have already received a user password or created a user account earlier? Use this option to (re-)login with existing credentials.",
                    login: LOGIN_TYPE_LOGIN
                }
            ]}
            header={<Header>What do you want to do?</Header>}
        />
    );

    return (
        <Box margin={{ bottom: "s" }}>
            <div className="custom-home__header">
                <Box padding={{ vertical: "xl", horizontal: "s" }}>
                    <Grid
                        gridDefinition={[
                            { offset: { l: 1, xxs: 1 }, colspan: { l: 8, xxs: 10 } },
                            { colspan: { xl: 8, l: 8, s: 8, xxs: 10 }, offset: { l: 1, xxs: 1 } }
                        ]}
                    >
                        <Box padding={{ top: "xs" }}>
                            <span className="custom-home__category">Management of AWS accounts</span>
                        </Box>
                        <div className="custom-home__header-title">
                            <Box variant="h1" fontWeight="heavy" padding="n" fontSize="display-l" color="inherit">
                                Sandbox Accounts for Events
                            </Box>
                            <Box fontWeight="light" padding={{ bottom: "s" }} fontSize="display-l" color="inherit">
                                Temporary AWS accounts
                            </Box>
                            <Box variant="p">
                                <span className="custom-home__header-sub-title">
                                    Sandbox Accounts for Events allows you to claim temporary "leases" for AWS sandbox or
                                    playground accounts, including automatic AWS account cleanup after expiration.
                                </span>
                            </Box>
                        </div>
                    </Grid>
                </Box>
            </div>
            <Box padding={{ top: "l", horizontal: "l" }}>
                {!User.isLoggedIn && LoginType === LOGIN_TYPE_NONE ? (
                    <LoginOptions />
                ) : (
                    <Authenticator
                        formFields={{
                            signUp: {
                                password: {
                                    label: 'Password:',
                                    placeholder: 'Create a password',
                                },
                                confirm_password: {
                                    label: 'Confirm new password',
                                    placeholder: 'Please confirm your new password:',
                                },
                            }
                        }}
                        loginMechanisms={['email']}
                        signUpAttributes={[]}
                        initialState={LoginType === LOGIN_TYPE_CREATE ? "signUp" : "signIn"}
                    >
                        {new RegExp(regExpAll(Config.LEASE_ID_REGEX)).test(urlParamEventId) ? (
                            <LeaseLogin />
                        ) : (
                            <EventLogin />
                        )}
                    </Authenticator>
                )}
            </Box>
        </Box>
    );
};

const Home = () => {
    const User = useSelector((state) => state.current_user);
    const [navigationOpen, setNavigationOpen] = useState(User.isLoggedIn);
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch({ type: "notification/dismiss" });
        dispatch({ type: "selection/dismiss" });
        dispatch({ type: "modal/dismiss" });
    }, [dispatch]);

    useEffect(() => {
        setNavigationOpen(User.isLoggedIn);
    }, [User.isLoggedIn]);

    return (
        <AppLayout
            disableContentPaddings={true}
            navigation={<Navigation />}
            content={<Content />}
            contentType="default"
            tools={<SideHelp />}
            navigationOpen={navigationOpen}
            onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
            ariaLabels={appLayoutLabels}
        />
    );
};

const SideHelp = () => (
    <HelpPanel header={<h2>Sandbox Accounts for Events</h2>}>
        <SpaceBetween size="m">
            <Box>
                Sandbox Accounts for Events is a tool to provide "temporary" AWS accounts, e.g. for one-day workshops or events. When the
                pre-defined time or budget is up, access is automatically revoked, the account resources are nuked and
                the account is returned. This webapp consists of the following building blocks
            </Box>
            <Box>
                <strong>Leases</strong>
                <br />A lease is the core component of Sandbox Accounts for Events. An event operator can create leases for uses, time- and
                budget-constrained. The lease is then handed over to the end user, allowing to log into the associated
                AWS account.
            </Box>
            <Box>
                <strong>AWS Accounts</strong>
                <br />
                Sandbox Accounts for Events does not create AWS accounts, but it manages a pool of accounts that have been pre-registered. 
                Sandbox Accounts for Events takes care of the lifecycle of creating and revoking leases as well as account cleanup.
            </Box>
            <Box>
                <strong>Users</strong>
                <br />
                To be able to consume a lease and an associated AWS account, users have to authenticate and create a
                user account in Sandbox Accounts for Events. After successful registration, they can use their leases to log
                into the AWS accounts.
            </Box>
            <Box>
                <strong>Events</strong>
                <br />
                Events allow
                you to provide & manage multiple AWS accounts at once, providing a single login link that automatically
                redirects users to their individual accounts.
            </Box>
        </SpaceBetween>
        <hr />
        <GitHubLinks/>
    </HelpPanel>
);

export default Home;
