import { useCollection } from "@cloudscape-design/collection-hooks";
import {
    AppLayout,
    Box,
    BreadcrumbGroup,
    Button,
    ButtonDropdown,
    Grid,
    Container,
    Header,
    HelpPanel,
    Link,
    SpaceBetween,
    Table,
    Spinner,
    Pagination,
    PropertyFilter
} from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router";
import { fetchEvent, terminateEvent, startEvent } from "../redux/actions/events";
import { deleteLease, createLease, terminateLeases } from "../redux/actions/leases";
import EmptyState from "./components/EmptyState";
import CopyClipboardIconButton from "./components/CopyClipboardIconButton";
import Navigation from "./components/Navigation";
import GitHubLinks from "./components/GitHubLinks";
import ConfirmationModal from "./modals/ConfirmationModal";
import NotificationFlashbar from "./components/NotificationFlashbar";
import CreateLeaseModal from "./modals/CreateLeaseModal";
import EditLeaseModal from "./modals/EditLeaseModal";
import AwsLoginModal from "./modals/AwsLoginModal";
import { leasesTableColumnDefinition } from "./components/table-config-leases";
import { PropertyFilteri18nStrings, paginationLabels } from "./components/labels";
import { toColorBox, toIconColorBox } from "./components/utils";
import EditEventModal from "./modals/EditEventModal";
import moment from "moment";

const EventModals = () => {
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
            <CreateLeaseModal />
            <EditLeaseModal />
            <ConfirmationModal
                visible={modal.status === "startEvent"}
                action={() => dispatch(startEvent(modal.item))}
                buttonText="Start event"
            >
                Do you really want to start event "{modal.item.eventName}" now? This will allow all event users to claim
                AWS accounts and log in.
            </ConfirmationModal>
            <ConfirmationModal
                visible={modal.status === "terminateEvent"}
                action={() => dispatch(terminateEvent(modal.item))}
                confirmationText="terminate"
                buttonText="Terminate"
                alert="warning"
            >
                Do you really want to terminate event "{modal.item.eventName}"? All AWS account access will be revoked
                and the AWS accounts cleanup process will start. This action cannot be undone.
            </ConfirmationModal>
            <EditEventModal />
            <AwsLoginModal />
        </Box>
    );
};

///////////////
// EVENT PAGE
///////////////

const DetailPanel = () => {
    const Config = useSelector((state) => state.config);
    const Item = useSelector((state) => state.events.item);
    const itemLoading = useSelector((state) => state.events.status);
    const dispatch = useDispatch();

    return (
        <SpaceBetween size="l">
            <Container
                header={
                    <Header
                        actions={
                            <ButtonDropdown
                                items={[
                                    {
                                        text: "Start",
                                        id: "startEvent",
                                        disabled: !Item || Item.eventStatus !== "Waiting"
                                    },
                                    {
                                        text: "Edit",
                                        id: "editEvent",
                                        disabled: !Item || Item.eventStatus === "Terminated"
                                    },
                                    {
                                        text: "Terminate",
                                        id: "terminateEvent",
                                        disabled: !Item || Item.eventStatus === "Terminated"
                                    }
                                ]}
                                onItemClick={({ detail }) => {
                                    switch (detail.id) {
                                        case "startEvent":
                                            dispatch({ type: "modal/open", status: "startEvent", item: Item });
                                            break;
                                        case "terminateEvent":
                                            dispatch({ type: "modal/open", status: "terminateEvent", item: Item });
                                            break;
                                        case "editEvent":
                                            dispatch({ type: "modal/open", status: "editEvent", item: Item });
                                            break;
                                        default:
                                    }
                                }}
                            >
                                Actions
                            </ButtonDropdown>
                        }
                    >
                        Event Details
                    </Header>
                }
                data-testid="detailPanel"
            >
                {itemLoading === "loading" || !Item ? (
                    <Box padding={{ top: "xl" }}>
                        <SpaceBetween direction="horizontal" size="m">
                            <Spinner />
                            <span>Loading event details</span>
                        </SpaceBetween>
                    </Box>
                ) : (
                    <SpaceBetween size="l">
                        <Box>
                            <Box variant="h5">Event status</Box>
                            {toIconColorBox(Item.eventStatus)}
                        </Box>
                        <Box>
                            <Box variant="h5">Login link for event attendees</Box>
                            <CopyClipboardIconButton
                                content={window.location.protocol + "//" + window.location.host + "/#/login/" + Item.id}
                            />
                        </Box>
                        <Box>
                            <Box variant="h5">Event start date</Box>
                            {Item.eventDate}
                        </Box>
                        <Box>
                            <Box variant="h5">Event ID</Box>
                            <CopyClipboardIconButton content={Item.id}>
                                <Link href={"#/events/" + Item.id}>{Item.id}</Link>
                            </CopyClipboardIconButton>
                        </Box>
                        <Box>
                            <Box variant="h5">Event duration</Box>
                            {(Item.eventDays > 0 ? Item.eventDays + "d " : "") +
                                Item.eventHours +
                                "h (" +
                                moment
                                    .unix(Item.eventOn)
                                    .add(Item.eventDays, "days")
                                    .add(Item.eventHours, "hours")
                                    .format(Config.FORMAT_DATETIME) +
                                ")"}
                        </Box>
                        <Box>
                            <Box variant="h5">Owner</Box>
                            <CopyClipboardIconButton content={Item.eventOwner}>
                                <Link href={"mailto:" + Item.eventOwner}>{Item.eventOwner}</Link>
                            </CopyClipboardIconButton>
                        </Box>
                        <Box>
                            <Box variant="h5">Maximum budget per AWS account</Box>
                            {Item.eventBudget + " USD"}
                        </Box>
                        <Box>
                            <Box variant="h5">Created on</Box>
                            {Item.createdDate}
                        </Box>
                    </SpaceBetween>
                )}
            </Container>
            <Container header={<Header>Current usage</Header>}>
                {itemLoading === "loading" || !Item ? (
                    <Box padding={{ top: "xl" }}>
                        <SpaceBetween direction="horizontal" size="m">
                            <Spinner />
                            <span>Loading event details</span>
                        </SpaceBetween>
                    </Box>
                ) : (
                    <SpaceBetween size="l">
                        <Box>
                            <Box variant="h5">Assigned AWS accounts</Box>
                            <Grid gridDefinition={[{ colspan: 3 }, { colspan: 3 }, { colspan: 3 }, { colspan: 3 }]}>
                                <Box>
                                    <small>MAX</small>
                                    {toColorBox("inherit", Item.maxAccounts)}
                                </Box>
                                <Box>
                                    <small>ENDED</small>
                                    {toColorBox("error", Item.terminatedAccounts)}
                                </Box>
                                <Box>
                                    <small>LEASED</small>
                                    {toColorBox("info", Item.leasedAccounts)}
                                </Box>
                                <Box>
                                    <small>FREE</small>
                                    {toColorBox("success", Item.freeAccounts)}
                                </Box>
                            </Grid>
                        </Box>
                        <Box>
                            <Box variant="h5">Current overall spend</Box>
                            {Item.eventSpend + " USD"}
                        </Box>
                    </SpaceBetween>
                )}
            </Container>
        </SpaceBetween>
    );
};

/////////////////
// LEASES TABLE
/////////////////

const LeasesTable = () => {
    const Config = useSelector((state) => state.config);
    const Item = useSelector((state) => state.events.item);
    const EventLeases = useSelector((state) => ({
        ...state.leases,
        items: state.leases.items.filter(
            (item) => item.principalId.substring(0, Config.EVENT_ID_LENGTH) === Item.id
        )
    }));
    const dispatch = useDispatch();

    const createEventLease = (item) => {
        if (Item.maxAccounts <= EventLeases.items.length) {
            dispatch({
                type: "notification/error",
                message:
                    "Cannot create new lease, already reached maximum of " +
                    Item.maxAccounts +
                    " leases for this event."
            });
            return;
        }
        dispatch(
            createLease({
                ...item,
                expiresOn: moment.unix(Item.eventOn).add(Item.eventDays, "days").add(Item.eventHours, "hours").unix()
            })
        );
    };

    const { items, actions, filteredItemsCount, collectionProps, propertyFilterProps, paginationProps } = useCollection(
        EventLeases.items,
        {
            propertyFiltering: {
                filteringProperties: [
                    {
                        propertyLabel: "User email",
                        key: "user",
                        operators: ["=", "!=", ":", "!:"]
                    },
                    {
                        propertyLabel: "AWS account ID",
                        key: "accountId",
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
                        propertyLabel: "Lease ID",
                        key: "id",
                        operators: [":", "!:", "=", "!="]
                    }
                ],
                empty: (
                    <EmptyState
                        title="No leases"
                        subtitle="No leases found."
                        action={
                            Item && Item.eventStatus !== "Terminated" ? (
                                <Button onClick={createEventLease}>Create lease</Button>
                            ) : null
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

    return (
        <Table
            {...collectionProps}
            columnDefinitions={leasesTableColumnDefinition}
            visibleColumns={["user", "leaseStatusReason", "budget", "accountId", "accountLogin"]}
            items={items}
            selectionType="multi"
            header={
                <Header
                    variant="h1"
                    selectedItems={collectionProps.selectedItems}
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button
                                disabled={
                                    collectionProps.selectedItems.length !== 1 ||
                                    collectionProps.selectedItems[0].leaseStatusReason !== "Active"
                                }
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
                                    collectionProps.selectedItems.reduce(
                                        (total, item) => total || item.leaseStatusReason !== "Active",
                                        false
                                    )
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
                                    collectionProps.selectedItems[0].leaseStatusReason === "Active"
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
                                onClick={() => dispatch({ type: "modal/open", status: "createLease", item: Item })}
                                disabled={!Item || Item.eventStatus === "Terminated"}
                                data-testid="createLeaseRow"
                            >
                                Create lease
                            </Button>
                        </SpaceBetween>
                    }
                >
                    Leased AWS accounts
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
            loading={EventLeases.status === "loading"}
        />
    );
};

////////////
// CONTENT
////////////

const Content = () => {
    const [forceRefresh, setForceRefresh] = useState(false);
    const { urlParamEventId } = useParams();
    const Config = useSelector((state) => state.config);
    const Item = useSelector((state) => state.events.item);
    const dispatch = useDispatch();

    useEffect(() => {
        const refreshTimer = setInterval(() => {
            dispatch(fetchEvent(urlParamEventId, false));
        }, Config.UPDATE_WEBSITE_INTERVAL * 1000);
        return () => clearInterval(refreshTimer);
    }, [dispatch, Config, urlParamEventId]);

    useEffect(() => {
        dispatch(fetchEvent(urlParamEventId));
    }, [forceRefresh, dispatch, urlParamEventId]);

    useEffect(() => {
        dispatch({ type: "notification/dismiss" });
        dispatch({ type: "selection/dismiss" });
        dispatch({ type: "modal/dismiss" });
    }, [dispatch]);

    const refreshNow = () => {
        setForceRefresh((refresh) => !refresh);
    };

    return (
        <SpaceBetween size="m">
            <Header variant="h1" actions={<Button iconName="refresh" onClick={refreshNow} />}>
                {Item.eventName ? (
                    <SpaceBetween direction="horizontal" size="s">
                        <span>Operate {Item ? '"' + Item.eventName + '"' : ""}</span>
                        <small>({Item ? Item.eventDate : ""})</small>
                    </SpaceBetween>
                ) : null}
            </Header>
            <Grid gridDefinition={[{ colspan: 4 }, { colspan: 8 }]}>
                <DetailPanel />
                <LeasesTable />
            </Grid>
            <EventModals />
        </SpaceBetween>
    );
};

//////////////////
// APP + CONTENT
//////////////////

const DetailEvent = () => {
    const { urlParamEventId } = useParams();

    return (
        <AppLayout
            navigation={<Navigation />}
            breadcrumbs={
                <BreadcrumbGroup
                    items={[
                        { text: "Admin", href: "#" },
                        { text: "Events", href: "#/events" },
                        { text: urlParamEventId, href: "#/events/" + urlParamEventId }
                    ]}
                />
            }
            contentType="default"
            tools={<SideHelp />}
            stickyNotifications
            notifications={<NotificationFlashbar />}
            content={<Content />}
        />
    );
};

const SideHelp = () => (
    <HelpPanel header={<h2>Sandbox Accounts for Events</h2>}>
        <Box>
            <Header variant="h3">Managing an Event</Header>
            <SpaceBetween size="m">
                <Box>
                    This website should be your main page to manage an event, providing all important information in one
                    place:
                </Box>
                <Box>
                    <ul>
                        <li>
                            <strong>Event Link</strong>, which you can forward and distribute across your event
                            attendees.
                        </li>
                        <li>
                            <strong>Lease Overview</strong> to provide full insights into lease status, AWS account
                            assignment, expiration and budget utilization.
                        </li>
                        <li>
                            <strong>Lease login links</strong> to directly log into an attendees AWS account, e.g. for
                            troubleshooting or individual support .
                        </li>
                    </ul>
                </Box>
                <Box>
                    From here, you can also create, terminate and delete/reset leases manually, as well as adjust lease
                    budget or expiration periods even in running events if needed.
                </Box>
            </SpaceBetween>
        </Box>
        <hr />
        <Box>
            <Header variant="h3">Event Status</Header>
            <SpaceBetween size="m">
                <Box>
                    <strong>Waiting</strong>
                    <br />
                    Event hasn't been started yet, user can not retrieve leases to log into their AWS accounts. You can
                    start the event early manually or let it autostart from the event start timestamp.
                </Box>
                <Box>
                    <strong>Running</strong>
                    <br />
                    Event is currently on, users can retrieve leases to log into their AWS accounts. The event will
                    auto-terminate at the end of its scheduled lifetime.
                </Box>
                <Box>
                    <strong>Terminated</strong>
                    <br />
                    Event has been terminated, this can not be reverted back to a previous state. Users can not retrieve
                    leases any more, leases all have been terminated as well, AWS account cleanup process is in progress
                    or already finished.
                </Box>
            </SpaceBetween>
        </Box>
        <hr />
        <Box>
            <Header variant="h3">Limitations</Header>
            <ul>
                <li>You cannot delete a lease that is still in "Active" state.</li>
            </ul>
        </Box>
        <hr />
        <GitHubLinks/>
    </HelpPanel>
);

export default DetailEvent;
