import React, { useEffect, useState } from "react";
import { useCollection } from "@cloudscape-design/collection-hooks";
import {
    AppLayout,
    Link,
    Box,
    BreadcrumbGroup,
    HelpPanel,
    Table,
    Button,
    Header,
    Pagination,
    PropertyFilter,
    SpaceBetween,
    SplitPanel,
    ColumnLayout,
    ProgressBar
} from "@cloudscape-design/components";
import Navigation from "./components/Navigation";
import GitHubLinks from "./components/GitHubLinks";
import { useSelector, useDispatch } from "react-redux";
import { fetchLeases, deleteLease, terminateLeases } from "../redux/actions/leases";
import { toColorBox } from "./components/utils";
import EmptyState from "./components/EmptyState";
import ConfirmationModal from "./modals/ConfirmationModal";
import NotificationFlashbar from "./components/NotificationFlashbar";
import CreateLeaseModal from "./modals/CreateLeaseModal";
import AwsLoginModal from "./modals/AwsLoginModal";
import EditLeaseModal from "./modals/EditLeaseModal";
import { SplitPaneli18nStrings, PropertyFilteri18nStrings, paginationLabels } from "./components/labels";
import CopyClipboardIconButton from "./components/CopyClipboardIconButton";
import { useParams } from "react-router";
import { leasesTableColumnDefinition } from "./components/table-config-leases";

const LeaseModals = () => {
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();

    return (
        <Box>
            <ConfirmationModal
                visible={modal.status === "deleteLease"}
                action={() => dispatch(deleteLease(modal.item))}
                confirmationText="delete"
                buttonText="Delete"
            >
                Do you really want to delete the lease for <strong>{modal.item.user}</strong>? The user will consume a
                new AWS account when logging in to this event next time.
            </ConfirmationModal>
            <ConfirmationModal
                visible={modal.status === "terminateLease"}
                action={() => dispatch(terminateLeases(modal.items))}
                confirmationText="terminate"
                buttonText="Terminate"
            >
                Do you really want to terminate {modal.items.length} lease{modal.items.length > 1 ? "s" : ""}? Users
                will not be able to log into their AWS accounts any more.
                <br />
                Lease user{modal.items.length > 1 ? "s" : ""}:{" "}
                <ul>
                    {modal.items.map((item, idx) => (
                        <li key={idx}>{item.user}</li>
                    ))}
                </ul>
            </ConfirmationModal>
            <CreateLeaseModal isAdminView={true} />
            <EditLeaseModal isAdminView={true} />
            <AwsLoginModal />
        </Box>
    );
};

///////////////
// ITEM TABLE
///////////////

const ItemTable = () => {
    const { urlParamLeaseId } = useParams();
    const [initialItemId, setInitialItemId] = useState();
    const [forceRefresh, setForceRefresh] = useState(false);
    const Config = useSelector((state) => state.config);
    const Items = useSelector((state) => state.leases);
    const dispatch = useDispatch();

    const { items, actions, filteredItemsCount, collectionProps, propertyFilterProps, paginationProps } = useCollection(
        Items.items,
        {
            propertyFiltering: {
                filteringProperties: [
                    {
                        propertyLabel: "Lease ID",
                        key: "id",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "AWS account ID",
                        key: "accountId",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "Event ID",
                        key: "eventId",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "Status",
                        key: "leaseStatus",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "Status reason",
                        key: "leaseStatusReason",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "Last modified on",
                        key: "lastModifiedDate",
                        operators: [":", "!:", "=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Created on",
                        key: "createdDate",
                        operators: [":", "!:", "=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Expires on",
                        key: "ExpiresDate",
                        operators: [":", "!:", "=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Lease status last modified on",
                        key: "leaseStatusModifiedDate",
                        operators: [":", "!:", "=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Budget",
                        key: "budgetAmount",
                        operators: ["=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Current spend",
                        key: "spendAmount",
                        operators: ["=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Budget utilized",
                        key: "spendPercent",
                        operators: ["=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Expiration period utilized",
                        key: "expiresPercent",
                        operators: ["=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "User email",
                        key: "user",
                        operators: ["=", "!=", ":", "!:"]
                    },
                    {
                        propertyLabel: "Principal ID",
                        key: "principalId",
                        operators: ["=", "!=", ":", "!:"]
                    }
                ],
                empty: (
                    <EmptyState
                        title="No leases"
                        subtitle="No leases found."
                        action={
                            <Button onClick={() => dispatch({ type: "modal/open", status: "createLease" })}>
                                Create lease
                            </Button>
                        }
                    />
                ),
                noMatch: (
                    <EmptyState
                        title="No matches"
                        subtitle="We cannot find a matching lease."
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
        if (initialItemId !== urlParamLeaseId) {
            actions.setPropertyFiltering({
                tokens: [
                    {
                        propertyKey: "id",
                        operator: "=",
                        value: urlParamLeaseId
                    }
                ],
                operation: "and"
            });
            setInitialItemId(urlParamLeaseId);
        }
    }, [urlParamLeaseId, actions, initialItemId]);

    useEffect(() => {
        const refreshTimer = setInterval(() => {
            dispatch(fetchLeases(false));
        }, Config.UPDATE_WEBSITE_INTERVAL * 1000);
        return () => clearInterval(refreshTimer);
    }, [dispatch, Config]);

    useEffect(() => {
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

    ///////////////
    // ITEM TABLE
    ///////////////

    return (
        <Box>
            <Table
                {...collectionProps}
                columnDefinitions={leasesTableColumnDefinition}
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
                                            status: "editLease",
                                            item: collectionProps.selectedItems[0]
                                        })
                                    }
                                    data-testid="editLeaseRow"
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
                                            status: "terminateLease",
                                            items: collectionProps.selectedItems
                                        })
                                    }
                                    data-testid="terminateLeaseRow"
                                >
                                    Terminate
                                </Button>
                                <Button
                                    disabled={
                                        collectionProps.selectedItems.length !== 1 ||
                                        collectionProps.selectedItems[0].leaseStatus !== "Inactive"
                                    }
                                    onClick={() =>
                                        dispatch({
                                            type: "modal/open",
                                            status: "deleteLease",
                                            item: collectionProps.selectedItems[0]
                                        })
                                    }
                                    data-testid="deleteLeaseRow"
                                >
                                    Delete
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => dispatch({ type: "modal/open", status: "createLease" })}
                                    data-testid="createLeaseRow"
                                >
                                    Create lease
                                </Button>
                            </SpaceBetween>
                        }
                    >
                        Leases
                    </Header>
                }
                filter={
                    <PropertyFilter
                        {...propertyFilterProps}
                        i18nStrings={PropertyFilteri18nStrings}
                        filteringPlaceholder="Find leases"
                        countText={filteredItemsCount + " match" + (filteredItemsCount === 1 ? "" : "es")}
                    />
                }
                pagination={<Pagination {...paginationProps} ariaLabels={paginationLabels} />}
                loading={Items.status === "loading"}
            />
            <LeaseModals />
        </Box>
    );
};

////////////////
// SPLIT PANEL
////////////////

const DetailSplitPanel = () => {
    const leases = useSelector((state) => state.leases.items);
    const selection = useSelector((state) => state.selection);
    const [item, setItem] = useState({});

    useEffect(() => {
        if (selection.status === "selected") {
            setItem(leases.find((lease) => lease.id === selection.id) ?? {});
        }
    }, [selection, leases]);

    return selection.id ? (
        <SplitPanel 
            header="Lease details" 
            i18nStrings={SplitPaneli18nStrings} 
            hidePreferencesButton
            data-testid="splitPanel"
        >
            <ColumnLayout columns={3}>
                <Box>
                    <Box variant="h5">User</Box>
                    <CopyClipboardIconButton content={item.user}>
                        <Link href={"#/users/" + encodeURIComponent(item.user)}>{item.user}</Link>
                    </CopyClipboardIconButton>
                </Box>
                <Box>
                    <Box variant="h5">Status</Box>
                    {toColorBox(item.leaseStatus)}
                </Box>
                <Box>
                    <Box variant="h5">Created on</Box>
                    {item.createdDate}
                </Box>
                <Box>
                    <Box variant="h5">Event ID</Box>
                    {item.eventId === "" ? (
                        "-"
                    ) : (
                        <CopyClipboardIconButton content={item.eventId}>
                            <Link href={"#/events/" + item.eventId}>{item.eventId}</Link>
                        </CopyClipboardIconButton>
                    )}
                </Box>
                <Box>
                    <Box variant="h5">Status reason</Box>
                    {item.leaseStatusReason}
                </Box>
                <Box>
                    <Box variant="h5">Expires on</Box>
                    {item.expiresDate}
                </Box>
                <Box>
                    <Box variant="h5">Lease ID</Box>
                    <CopyClipboardIconButton content={item.id}>
                        <Link href={"#/leases/" + item.id}>{item.id}</Link>
                    </CopyClipboardIconButton>
                </Box>
                <Box>
                    <Box variant="h5">Budget</Box>
                    {item.budgetAmount} {item.budgetCurrency}
                </Box>
                <Box>
                    <Box variant="h5">Last modified on</Box>
                    {item.lastModifiedDate}
                </Box>
                <Box>
                    <Box variant="h5">AWS account ID</Box>
                    <CopyClipboardIconButton content={item.accountId}>
                        <Link href={"#/accounts/" + item.accountId}>{item.accountId}</Link>
                    </CopyClipboardIconButton>
                </Box>
                <Box>
                    <Box variant="h5">Current spend</Box>
                    {item.spendAmount} {item.budgetCurrency}
                </Box>
                <Box>
                    <Box variant="h5">Lease status modified on</Box>
                    {item.leaseStatusModifiedDate}
                </Box>
                <Box>
                    <Box variant="h5">Principal ID</Box>
                    <CopyClipboardIconButton content={item.principalId} />
                </Box>
                <Box>
                    <Box variant="h5">Budget utilized</Box>
                    <ProgressBar variant="key-value" value={item.spendPercent} />
                </Box>
                <Box>
                    <Box variant="h5">Expiration period utilized</Box>
                    <ProgressBar variant="key-value" value={item.expiresPercent} />
                </Box>
            </ColumnLayout>
            <Box margin={{ top: "xxxl", bottom: "xl" }}>
                <Box variant="h5">AWS account direct login link</Box>
                <CopyClipboardIconButton
                    content={window.location.protocol + "//" + window.location.host + "/#/login/" + item.id}
                >
                    <Link
                        href={window.location.protocol + "//" + window.location.host + "/#/login/" + item.id}
                        external
                    >
                        {window.location.protocol + "//" + window.location.host + "/#/login/" + item.id}
                    </Link>
                </CopyClipboardIconButton>
            </Box>
        </SplitPanel>
    ) : null;
};

//////////////////
// APP + CONTENT
//////////////////

const OverviewLeases = () => {
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
                        { text: "Leases", href: "#/leases" }
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
            <Header variant="h3">Leases List</Header>
            <SpaceBetween size="m">
                <Box>
                    This list shows the list of leases that have been created with Sandbox Accounts for Events, including both active and
                    termniated leases. A lease can have two status types:
                </Box>
                <Box>
                    <strong>Active</strong>
                    <br />
                    Lease is currently in use, i.e. the end user can log into the associated AWS account via this lease.
                    It will automatically terminate when either time or budget limit is hit.
                </Box>
                <Box>
                    <strong>Inactive</strong>
                    <br />
                    Lease has been terminated. The column "Expiration" explain the reason and timestamp for the
                    termination.
                </Box>
            </SpaceBetween>
        </Box>
        <hr />
        <Box>
            <Header variant="h3">Creating a Lease</Header>
            You can create leases for end users manually, although the default process would be to create an event
            and let Sandbox Accounts for Events take care of the assignment of end users to AWS accounts. When creating a lease manually, you
            can choose to assign it to an existing event (in this case the event ID is required), or to leave it
            unassigned.
        </Box>
        <hr />
        <Box>
            <Header variant="h3">Limitations</Header>
            <ul>
                <li>You cannot delete a lease that is still in "Active" state.</li>
                <li>
                    <strong>
                        CAUTION: Only update AWS lease records if you are 100% sure what you are doing there. You
                        updates will be directly written into the backend databases, which could lead to inconsistencies and
                        undesired behavior when used incorrectly.
                    </strong>
                </li>
            </ul>
        </Box>
        <hr />
        <GitHubLinks/>
    </HelpPanel>
);

export default OverviewLeases;
