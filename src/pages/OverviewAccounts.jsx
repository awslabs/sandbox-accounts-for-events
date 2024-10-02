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
    PropertyFilter,
    SpaceBetween,
    SplitPanel,
    Table
} from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router";
import { fetchAccounts, removeAccounts } from "../redux/actions/accounts";
import { fetchLeases } from "../redux/actions/leases";
import { toColorBox } from "./components/utils";
import { PropertyFilteri18nStrings, SplitPaneli18nStrings, paginationLabels } from "./components/labels";
import CopyClipboardIconButton from "./components/CopyClipboardIconButton";
import EmptyState from "./components/EmptyState";
import Navigation from "./components/Navigation";
import GitHubLinks from "./components/GitHubLinks";
import NotificationFlashbar from "./components/NotificationFlashbar";
import ConfirmationModal from "./modals/ConfirmationModal";
import EditAccountModal from "./modals/EditAccountModal";
import AwsLoginModal from "./modals/AwsLoginModal";
import LogModal from "./modals/LogModal";
import RegisterAccountsModal from "./modals/RegisterAccountsModal";
import { leasesTableColumnDefinition } from "./components/table-config-leases";

const AccountModals = () => {
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();

    return (
        <Box>
            <ConfirmationModal
                visible={modal.status === "removeAccount"}
                action={() => dispatch(removeAccounts(modal.items))}
                confirmationText="remove"
                buttonText="Remove"
            >
                Do you really want to remove {modal.items.length} AWS account
                {modal.items.length > 1 ? "s" : ""}?
                <br />
                Account ID{modal.items.length > 1 ? "s" : ""}:{" "}
                <ul>
                    {modal.items.map((item, idx) => (
                        <li key={idx}>{item.id}</li>
                    ))}
                </ul>
            </ConfirmationModal>
            <RegisterAccountsModal />
            <EditAccountModal />
            <LogModal />
            <AwsLoginModal />
        </Box>
    );
};

///////////////
// ITEM TABLE
///////////////

const ItemTable = () => {
    const [forceRefresh, setForceRefresh] = useState(false);
    const { urlParamAccountId } = useParams();
    const [initialItemId, setInitialItemId] = useState();
    const Config = useSelector((state) => state.config);
    const Items = useSelector((state) => state.accounts);
    const dispatch = useDispatch();

    const { items, actions, filteredItemsCount, collectionProps, propertyFilterProps, paginationProps } = useCollection(
        Items.items,
        {
            propertyFiltering: {
                filteringProperties: [
                    {
                        propertyLabel: "AWS account ID",
                        key: "id",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "Account status",
                        key: "accountStatus",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "Last modified on",
                        key: "lastModifiedDate",
                        operators: [":", "!:", "=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Registered on",
                        key: "createdDate",
                        operators: [":", "!:", "=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Admin role",
                        key: "adminRoleName",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "Principal role",
                        key: "principalRoleName",
                        operators: [":", "!:", "=", "!="]
                    }
                ],
                empty: (
                    <EmptyState
                        title="No accounts"
                        subtitle="No AWS accounts registered."
                        action={
                            <Button onClick={() => dispatch({ type: "modal/open", status: "registerAccount" })}>
                                Register account(s)
                            </Button>
                        }
                    />
                ),
                noMatch: (
                    <EmptyState
                        title="No matches"
                        subtitle="We cannot find a matching account."
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
                trackBy: "id"
            }
        }
    );

    /////////////////
    // LAZY LOADING
    /////////////////

    useEffect(() => {
        if (initialItemId !== urlParamAccountId) {
            actions.setPropertyFiltering({
                tokens: [
                    {
                        propertyKey: "id",
                        operator: "=",
                        value: urlParamAccountId
                    }
                ],
                operation: "and"
            });
            setInitialItemId(urlParamAccountId);
        }
    }, [urlParamAccountId, actions, initialItemId]);

    useEffect(() => {
        const refreshTimer = setInterval(() => {
            dispatch(fetchAccounts(false));
            dispatch(fetchLeases(false));
        }, Config.UPDATE_WEBSITE_INTERVAL * 1000);
        return () => clearInterval(refreshTimer);
    }, [dispatch, Config]);

    useEffect(() => {
        dispatch(fetchAccounts());
        dispatch(fetchLeases());
    }, [forceRefresh, dispatch]);

    useEffect(() => {
        if (collectionProps.selectedItems.length === 1) {
            dispatch({ type: "selection/set", id: collectionProps.selectedItems[0].id });
        } else {
            dispatch({ type: "selection/dismiss" });
        }
    }, [forceRefresh, dispatch, collectionProps.selectedItems]);

    const refreshNow = () => {
        setForceRefresh((refresh) => !refresh);
    };

    //////////
    // TABLE
    //////////

    return (
        <Box>
            <Table
                {...collectionProps}
                columnDefinitions={[
                    {
                        id: "id",
                        header: "AWS account ID",
                        sortingField: "id",
                        cell: (item) => <Link href={"#/accounts/" + item.id}>{item.id}</Link>
                    },
                    {
                        id: "accountStatus",
                        header: "Status",
                        sortingField: "accountStatus",
                        cell: (item) => toColorBox(item.accountStatus)
                    },
                    {
                        id: "createdDate",
                        header: "Registered",
                        sortingField: "createdDate",
                        cell: (item) => item.createdDate || "-"
                    },
                    {
                        id: "lastModifiedDate",
                        header: "Last modified",
                        sortingField: "lastModifiedDate",
                        cell: (item) => item.lastModifiedDate || "-"
                    },
                    {
                        id: "adminRoleName",
                        header: "Admin role",
                        sortingField: "adminRoleName",
                        cell: (item) => item.adminRoleName || "-"
                    },
                    {
                        id: "principalRoleName",
                        header: "Principal role",
                        sortingField: "principalRoleName",
                        cell: (item) => item.principalRoleName || "-"
                    }
                ]}
                items={items}
                selectionType="multi"
                header={
                    <Header
                        variant="h1"
                        counter={"(" + Items.items.length + ")"}
                        selectedItems={collectionProps.selectedItems}
                        actions={
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button iconName="refresh" onClick={refreshNow} />
                                <Button
                                    disabled={collectionProps.selectedItems.length !== 1}
                                    onClick={() =>
                                        dispatch({
                                            type: "modal/open",
                                            status: "editAccount",
                                            item: collectionProps.selectedItems[0]
                                        })
                                    }
                                    data-testid="editAccountRow"
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
                                            status: "removeAccount",
                                            items: collectionProps.selectedItems
                                        })
                                    }
                                    data-testid="removeAccountRow"
                                >
                                    Remove
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => dispatch({ type: "modal/open", status: "registerAccount" })}
                                    data-testid="registerAccountRow"
                                >
                                    Register account(s)
                                </Button>
                            </SpaceBetween>
                        }
                    >
                        AWS accounts registered as children
                    </Header>
                }
                filter={
                    <PropertyFilter
                        {...propertyFilterProps}
                        i18nStrings={PropertyFilteri18nStrings}
                        filteringPlaceholder="Find accounts"
                        countText={filteredItemsCount + " match" + (filteredItemsCount === 1 ? "" : "es")}
                    />
                }
                pagination={<Pagination {...paginationProps} ariaLabels={paginationLabels} />}
                loading={Items.status === "loading"}
            />
            <AccountModals />
        </Box>
    );
};

////////////////
// SPLIT PANEL
////////////////

const DetailSplitPanel = () => {
    const accounts = useSelector((state) => state.accounts);
    const leases = useSelector((state) => state.leases);
    const selection = useSelector((state) => state.selection);
    const [item, setItem] = useState({});
    const [AccountLeases, setAccountLeases] = useState([]);
    const Config = useSelector((state) => state.config);
    const { items, collectionProps } = useCollection(AccountLeases, {
        filtering: {},
        pagination: { pageSize: Config.SUBITEM_PAGE_SIZE },
        sorting: {}
    });

    useEffect(() => {
        if (selection.status === "selected") {
            setItem(accounts.items.find((account) => account.id === selection.id) ?? {});
            setAccountLeases(leases.items.filter((accountItem) => accountItem.accountId === selection.id));
        }
    }, [selection, accounts, leases, Config]);

    return selection.id ? (
        <SplitPanel 
            header="AWS account details" 
            i18nStrings={SplitPaneli18nStrings} 
            hidePreferencesButton
            data-testid="splitPanel"
        >
            <ColumnLayout columns={3}>
                <Box>
                    <Box variant="h5">AWS account ID</Box>
                    <CopyClipboardIconButton content={item.id}>
                        <Link href={"#/accounts/" + item.id}>{item.id}</Link>
                    </CopyClipboardIconButton>
                </Box>
                <Box>
                    <Box variant="h5">Registered on</Box>
                    {item.createdDate}
                </Box>
                <Box>
                    <Box variant="h5">Admin role ARN</Box>
                    <CopyClipboardIconButton content={item.adminRoleArn} />
                </Box>
                <Box>
                    <Box variant="h5">Status</Box>
                    {toColorBox(item.accountStatus)}
                </Box>
                <Box>
                    <Box variant="h5">Last modified on</Box>
                    {item.lastModifiedDate}
                </Box>
                <Box>
                    <Box variant="h5">Principal role ARN</Box>
                    <CopyClipboardIconButton content={item.principalRoleArn} />
                </Box>
            </ColumnLayout>
            <Box padding={{ top: "xl" }}>
                <Table
                    {...collectionProps}
                    items={items}
                    columnDefinitions={leasesTableColumnDefinition}
                    loading={leases.status === "loading"}
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
                            <Box variant="p">No leases found for account {item.id}.</Box>
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

const OverviewAccounts = () => {
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
                        { text: "Accounts", href: "#/accounts" }
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
    <HelpPanel header={<h2>Sandbox Accounts for Events</h2>}>
        <Box>
            <Header variant="h3">Account List</Header>
            <SpaceBetween size="m">
                <Box>
                    This list shows AWS accounts that have been registered with Sandbox Accounts for Events and are part of the account
                    pool. An AWS account can have three types of status:
                </Box>
                <Box>
                    <strong>Ready</strong>
                    <br />
                    AWS account is free, nuked and available for lease.
                </Box>
                <Box>
                    <strong>Leased</strong>
                    <br />
                    AWS account is currently leased, i.e. in user by a user. Revoke the lease to terminate the user
                    access, nuke and return it "Ready" pool.
                </Box>
                <Box>
                    <strong>NotReady</strong>
                    <br />
                    AWS account is currently not available. Most likely a lease has ended and it is waiting in the
                    account cleanup queue. As soon as AWS account cleaning it finished, it will automatically be
                    returned to the "Ready" pool.
                </Box>
            </SpaceBetween>
        </Box>
        <hr />
        <Box>
            <Header variant="h3">Roles</Header>
            Each registered AWS account requires two IAM roles:
            <SpaceBetween size="m">
                <Box>
                    <strong>Admin Role</strong>
                    <br />
                    Admin Role is used by the backend to create and revoke principal access roles as well as AWS account
                    cleanup when a lease has ended.
                </Box>
                <Box>
                    <strong>Principal Role</strong>
                    <br />
                    Principal Role is used by the end user that leases and AWS account. This role will automatically be
                    created and managed by the backend.
                </Box>
            </SpaceBetween>
        </Box>
        <hr />
        <Box>
            <Header variant="h3">Account Registration</Header>
            To be able to register an AWS account with Sandbox Accounts for Events, two requirements have to be fulfilled
            <SpaceBetween size="m">
                <Box>
                    <strong>Admin Role</strong>
                    <br />
                    The admin role must have a trust relationship to the Master account, so it can be assumed by the
                    backend. (See also
                    <Link
                        external
                        href="https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_cross-account-with-roles.html"
                    >
                        Tutorial for cross account access with roles
                    </Link>
                    , Step 2)
                </Box>
                <Box>
                    <strong>Account Alias</strong>
                    <br />
                    As a safety rule, the backend will only nuke accounts that have an AWS account alias. (See also
                    <Link external href="https://docs.aws.amazon.com/IAM/latest/UserGuide/console_account-alias.html">
                        Tutorial for creating an AWS account alias
                    </Link>
                    )
                </Box>
            </SpaceBetween>
        </Box>
        <hr />
        <Box>
            <Header variant="h3">Limitations</Header>
            <ul>
                <li>You cannot remove an AWS account that is not in "Ready" state.</li>
                <li>
                    <strong>
                        CAUTION: Only update AWS account records if you are 100% sure what you are doing there. You
                        updates will be directly written into the DCE databases, which could lead to inconsistencies and
                        undesired behavior when used incorrectly.
                    </strong>
                </li>
            </ul>
        </Box>
        <hr />
        <GitHubLinks/>
    </HelpPanel>
);

export default OverviewAccounts;
