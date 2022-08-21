import { useCollection } from "@cloudscape-design/collection-hooks";
import {
    AppLayout,
    Box,
    BreadcrumbGroup,
    Button,
    ColumnLayout,
    Header,
    HelpPanel,
    Link,
    Pagination,
    StatusIndicator,
    PropertyFilter,
    SpaceBetween,
    SplitPanel,
    Table
} from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router";
import { fetchUsers, deleteUsers } from "../redux/actions/users";
import { fetchLeases } from "../redux/actions/leases";
import { PropertyFilteri18nStrings, SplitPaneli18nStrings, paginationLabels } from "./components/labels";
import CopyClipboardIconButton from "./components/CopyClipboardIconButton";
import EmptyState from "./components/EmptyState";
import NotificationFlashbar from "./components/NotificationFlashbar";
import Navigation from "./components/Navigation";
import GitHubLinks from "./components/GitHubLinks";
import ConfirmationModal from "./modals/ConfirmationModal";
import AwsLoginModal from "./modals/AwsLoginModal";
import CreateUserModal from "./modals/CreateUserModal";
import EditUserModal from "./modals/EditUserModal";
import { leasesTableColumnDefinition } from "./components/table-config-leases";

const UserModals = () => {
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();

    return (
        <Box>
            <ConfirmationModal
                visible={modal.status === "deleteUser"}
                action={() => dispatch(deleteUsers(modal.items))}
                confirmationText="delete"
                buttonText="Delete"
            >
                Do you really want to delete {modal.items.length} user
                {modal.items.length > 1 ? "s" : ""}?
                <br />
                User{modal.items.length > 1 ? "s" : ""}:{" "}
                <ul>
                    {modal.items.map((item, idx) => (
                        <li key={idx}>{item.email}</li>
                    ))}
                </ul>
            </ConfirmationModal>
            <CreateUserModal />
            <EditUserModal />
            <AwsLoginModal />
        </Box>
    );
};

///////////////
// ITEM TABLE
///////////////

const ItemTable = () => {
    const { urlParamUserId } = useParams();
    const [initialItemId, setInitialItemId] = useState();
    const [forceRefresh, setForceRefresh] = useState(false);
    const Config = useSelector((state) => state.config);
    const Users = useSelector((state) => state.users);
    const dispatch = useDispatch();

    const { items, actions, filteredItemsCount, collectionProps, propertyFilterProps, paginationProps } = useCollection(
        Users.items,
        {
            propertyFiltering: {
                filteringProperties: [
                    {
                        propertyLabel: "Email address",
                        key: "email",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "Created",
                        key: "createdDate",
                        operators: [":", "!:", "=", "!=", "<", ">"]
                    },
                    {
                        propertyLabel: "Last modified",
                        key: "lastModifiedDate",
                        operators: [":", "!:", "=", "!=", "<", ">"]
                    },
                    {
                        propertyLabel: "Operator",
                        key: "isOperator",
                        operators: ["=", "!="]
                    },
                    {
                        propertyLabel: "Admin",
                        key: "isAdmin",
                        operators: ["=", "!="]
                    },
                    {
                        propertyLabel: "Status",
                        key: "status",
                        operators: ["=", "!="]
                    }
                ],
                empty: (
                    <EmptyState
                        title="No users"
                        subtitle="No users found."
                        action={
                            <Button onClick={() => dispatch({ type: "modal/open", status: "createUser" })}>
                                Create user
                            </Button>
                        }
                    />
                ),
                noMatch: (
                    <EmptyState
                        title="No matches"
                        subtitle="We cannot find a matching user."
                        action={
                            <Button onClick={() => actions.setPropertyFiltering({ tokens: [], operation: "and" })}>
                                Clear filters
                            </Button>
                        }
                    />
                )
            },
            pagination: { pageSize: Config.ITEM_PAGE_SIZE },
            sorting: {},
            selection: {
                trackBy: "email"
            }
        }
    );

    /////////////////
    // LAZY LOADING
    /////////////////

    useEffect(() => {
        if (initialItemId !== urlParamUserId) {
            actions.setPropertyFiltering({
                tokens: [
                    {
                        propertyKey: "email",
                        operator: "=",
                        value: decodeURIComponent(urlParamUserId)
                    }
                ],
                operation: "and"
            });
            setInitialItemId(urlParamUserId);
        }
    }, [urlParamUserId, actions, initialItemId]);

    useEffect(() => {
        dispatch(fetchUsers());
        dispatch(fetchLeases());
    }, [forceRefresh, dispatch]);

    useEffect(() => {
        if (collectionProps.selectedItems.length === 1) {
            dispatch({ type: "selection/set", id: collectionProps.selectedItems[0].email });
        } else {
            dispatch({ type: "selection/dismiss" });
        }
    }, [forceRefresh, dispatch, collectionProps.selectedItems]);

    const refreshNow = () => {
        setForceRefresh((refresh) => !refresh);
    };

    const populateMoreUsers = (newPage) => {
        if (!Users.nextToken) return;
        let requiredUsers = newPage * Config.ITEM_PAGE_SIZE;
        if (Users.nextToken && requiredUsers > Users.items.length) {
            dispatch(fetchUsers(true, requiredUsers));
        }
    };

    const populateAllUsers = () => {
        if (!Users.nextToken) return;
        dispatch(fetchUsers(false, Number.MAX_SAFE_INTEGER));
    };

    ///////////////
    // ITEM TABLE
    ///////////////

    return (
        <Box>
            <Table
                {...collectionProps}
                columnDefinitions={[
                    {
                        id: "email",
                        header: "Email address",
                        sortingField: "email",
                        cell: (item) => <Link href={"#/users/" + encodeURIComponent(item.email)}>{item.email}</Link>
                    },
                    {
                        id: "isOperator",
                        header: "Operator",
                        sortingField: "isOperator",
                        cell: (item) => (item.isOperator ? <StatusIndicator type="success" /> : "-")
                    },
                    {
                        id: "isAdmin",
                        header: "Admin",
                        sortingField: "isAdmin",
                        cell: (item) => (item.isAdmin ? <StatusIndicator type="success" /> : "-")
                    },
                    {
                        id: "createdDate",
                        header: "Created",
                        sortingField: "createdDate",
                        cell: (item) => item.createdDate
                    },
                    {
                        id: "lastModifiedDate",
                        header: "Last modified",
                        sortingField: "lastModifiedDate",
                        cell: (item) => item.lastModifiedDate
                    },
                    {
                        id: "status",
                        header: "Status",
                        sortingField: "status",
                        cell: (item) => item.status
                    }
                ]}
                items={items}
                selectionType="multi"
                header={
                    <Header
                        variant="h1"
                        selectedItems={collectionProps.selectedItems}
                        counter={"(" + Users.items.length + (Users.nextToken ? "+)" : ")")}
                        actions={
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button iconName="refresh" onClick={refreshNow} />
                                <Button
                                    disabled={collectionProps.selectedItems.length !== 1}
                                    onClick={() =>
                                        dispatch({
                                            type: "modal/open",
                                            status: "editUser",
                                            item: collectionProps.selectedItems[0]
                                        })
                                    }
                                    data-testid="editUserRow"
                                >
                                    Edit
                                </Button>
                                <Button
                                    disabled={
                                        collectionProps.selectedItems.length === 0 ||
                                        collectionProps.selectedItems.length > 10
                                    }
                                    onClick={() =>
                                        dispatch({
                                            type: "modal/open",
                                            status: "deleteUser",
                                            items: collectionProps.selectedItems
                                        })
                                    }
                                    data-testid="deleteUserRow"
                                >
                                    Delete
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => dispatch({ type: "modal/open", status: "createUser" })}
                                    data-testid="createUserRow"
                                >
                                    Create user
                                </Button>
                            </SpaceBetween>
                        }
                    >
                        Users
                    </Header>
                }
                filter={
                    <PropertyFilter
                        {...propertyFilterProps}
                        i18nStrings={PropertyFilteri18nStrings}
                        filteringPlaceholder="Find users"
                        countText={filteredItemsCount + " match" + (filteredItemsCount === 1 ? "" : "es")}
                    />
                }
                pagination={
                    <SpaceBetween direction="horizontal">
                        <Pagination
                            {...paginationProps}
                            openEnd={Users.nextToken}
                            onChange={(event) => {
                                populateMoreUsers(event.detail.currentPageIndex);
                                paginationProps.onChange(event);
                            }}
                            ariaLabels={paginationLabels}
                        />
                        {Users.nextToken ? (
                            <Button variant="link" onClick={populateAllUsers} loading={Users.status === "loadingAll"}>
                                load all
                            </Button>
                        ) : null}
                    </SpaceBetween>
                }
                loading={Users.status === "loading"}
            />
            <UserModals />
        </Box>
    );
};
////////////////
// SPLIT PANEL
////////////////

const DetailSplitPanel = () => {
    const users = useSelector((state) => state.users);
    const leases = useSelector((state) => state.leases);
    const selection = useSelector((state) => state.selection);
    const [item, setItem] = useState({});
    const [UserLeases, setUserLeases] = useState([]);
    const Config = useSelector((state) => state.config);
    const { items, collectionProps } = useCollection(UserLeases, {
        filtering: {},
        pagination: { pageSize: Config.SUBITEM_PAGE_SIZE },
        sorting: {}
    });

    useEffect(() => {
        if (selection.status === "selected") {
            setItem(users.items.find((user) => user.email === selection.id) ?? {});
            setUserLeases(leases.items.filter((userItem) => userItem.user === selection.id));
        }
    }, [selection, users, leases, Config]);

    return selection.id ? (
        <SplitPanel 
            header="User details" 
            i18nStrings={SplitPaneli18nStrings} 
            hidePreferencesButton
            data-testid="splitPanel"
        >
            <ColumnLayout columns={4}>
                <Box>
                    <Box variant="h5">Email address</Box>
                    <CopyClipboardIconButton content={item.email}>
                        <Link href={"#/users/" + encodeURIComponent(item.email)}>{item.email}</Link>
                    </CopyClipboardIconButton>
                    <Box>{item.status}</Box>
                </Box>
                <Box>
                    <Box variant="h5">Roles</Box>
                    {item.isOperator ? <Box>Operator</Box> : ""}
                    {item.isAdmin ? <Box>Administrator</Box> : ""}
                    {!item.isOperator && !item.isAdmin ? <Box>-</Box> : null}
                </Box>
                <Box>
                    <Box variant="h5">Created on</Box>
                    {item.createdDate}
                </Box>
                <Box>
                    <Box variant="h5">Last modified on</Box>
                    {item.lastModifiedDate}
                </Box>
            </ColumnLayout>
            <Box padding={{ top: "xl" }}>
                <Table
                    {...collectionProps}
                    items={items}
                    columnDefinitions={leasesTableColumnDefinition}
                    loading={users.status === "loading"}
                    visibleColumns={[
                        "id",
                        "leaseStatus",
                        "eventId",
                        "user",
                        "leaseStatusReason",
                        "accountId",
                        "accountLogin"
                    ]}
                    empty={
                        <Box textAlign="center" color="inherit">
                            <b>No resources</b>
                            <Box variant="p">No leases found for user {item.email}.</Box>
                        </Box>
                    }
                />
            </Box>
        </SplitPanel>
    ) : null;
};

//////////////////
// APP + CONTENT
//////////////////

const OverviewUsers = () => {
    const [splitPanelSize, setSplitPanelSize] = useState(500);
    const [splitPanelOpen, setSplitPanelOpen] = useState(false);
    const [hasManuallyClosedOnce, setHasManuallyClosedOnce] = useState(false);
    const hasSelection = useSelector((state) => state.selection.status === "selected");
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch({ type: "notification/dismiss" });
        dispatch({ type: "selection/dismiss" });
        dispatch({ type: "modal/dismiss" });
    }, [dispatch]);

    useEffect(() => {
        if (hasSelection && !hasManuallyClosedOnce) {
            setSplitPanelOpen(true);
        }
    }, [hasSelection, hasManuallyClosedOnce]);

    const onSplitPanelResize = ({ detail: { size } }) => {
        setSplitPanelSize(size);
    };

    const onSplitPanelToggle = ({ detail: { open } }) => {
        setSplitPanelOpen(open);

        if (!open) {
            setHasManuallyClosedOnce(true);
        }
    };

    return (
        <AppLayout
            navigation={<Navigation />}
            breadcrumbs={
                <BreadcrumbGroup
                    items={[
                        { text: "Admin", href: "#" },
                        { text: "Users", href: "#/users" }
                    ]}
                />
            }
            contentType="default"
            tools={<SideHelp />}
            onSplitPanelToggle={onSplitPanelToggle}
            splitPanelOpen={splitPanelOpen}
            splitPanelSize={splitPanelSize}
            onSplitPanelResize={onSplitPanelResize}
            splitPanel={<DetailSplitPanel />}
            stickyNotifications
            notifications={<NotificationFlashbar />}
            content={<ItemTable />}
        />
    );
};

const SideHelp = () => (
    <HelpPanel header={<h2>Sandbox Accounts for Events</h2>} className="test-class">
        <Box>
            <Header variant="h3">User List</Header>
            <SpaceBetween size="m">
                <Box>Sandbox Accounts for Events has three types of users:</Box>
                <Box>
                    <strong>Operator</strong>
                    <br />
                    Operators manages events and the according AWS account leases. The operator can also log into any
                    leased AWS account, e.g. for troubleshooting.
                </Box>
                <Box>
                    <strong>Admin</strong>
                    <br />
                    Admins can perform any tasks that operators can perform. Additionally, admins manage the underlying
                    AWS account pool, user lists and status tables.
                </Box>
                <Box>
                    <strong>End user</strong>
                    <br />
                    An end user can lease ang into a given AWS account via an event ID or lease ID.
                </Box>
            </SpaceBetween>
        </Box>
        <hr />
        <Box>
            <Header variant="h3">User Status</Header>
            <SpaceBetween size="m">
                <Box>
                    <strong>CONFIRMED</strong>
                    <br />
                    User account is created and validated. The user can log in via email + password.
                </Box>
                <Box>
                    <strong>UNCONFIRMED</strong>
                    <br />
                    User account is created, but is waiting for the email verification. The user has received an email
                    with a verification code that needs to be entered to validate the user account.
                </Box>
                <Box>
                    <strong>FORCE_CHANGE_PASSWORD</strong>
                    <br />
                    User is created and validated. The user has received an email with the initial login password. On
                    first login, the user needs to change this password.
                </Box>
            </SpaceBetween>
        </Box>
        <hr />
        <Box>
            <Header variant="h3">Limitations</Header>
            <ul>
                <li>You cannot change a user's email address once created.</li>
                <li>You cannot delete your own user account. Contact another admin to delete your user account.</li>
                <li>
                    You cannot revoke admin rights from your own user account. Contact another admin to revoke admin
                    rights from your account.
                </li>
            </ul>
        </Box>
        <hr />
        <GitHubLinks/>
    </HelpPanel>
);

export default OverviewUsers;
