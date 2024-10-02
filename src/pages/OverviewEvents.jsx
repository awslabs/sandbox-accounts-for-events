import { useCollection } from "@cloudscape-design/collection-hooks";
import {
    AppLayout,
    Box,
    BreadcrumbGroup,
    Button,
    ButtonDropdown,
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
import { fetchEvents, deleteEvent, terminateEvent, startEvent } from "../redux/actions/events";
import { useNavigate } from "react-router-dom";
import { PropertyFilteri18nStrings, SplitPaneli18nStrings, paginationLabels } from "./components/labels";
import CopyClipboardIconButton from "./components/CopyClipboardIconButton";
import EmptyState from "./components/EmptyState";
import NotificationFlashbar from "./components/NotificationFlashbar";
import GitHubLinks from "./components/GitHubLinks";
import Navigation from "./components/Navigation";
import ConfirmationModal from "./modals/ConfirmationModal";
import CreateEventModal from "./modals/CreateEventModal";
import AwsLoginModal from "./modals/AwsLoginModal";
import EditEventModal from "./modals/EditEventModal";
import { leasesTableColumnDefinition } from "./components/table-config-leases";
import { toIconColorBox } from "./components/utils";
import moment from "moment";

const EventModals = () => {
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();

    return (
        <Box>
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
            <ConfirmationModal
                visible={modal.status === "deleteEvent"}
                action={() => dispatch(deleteEvent(modal.item))}
                confirmationText="delete"
                buttonText="Delete"
            >
                Do you really want to delete event "{modal.item.eventName}" on "{modal.item.eventDate}"?
            </ConfirmationModal>
            <CreateEventModal />
            <EditEventModal />
            <AwsLoginModal />
        </Box>
    );
};

///////////////
// ITEM TABLE
///////////////

const ItemTable = () => {
    const [forceRefresh, setForceRefresh] = useState(false);
    const Config = useSelector((state) => state.config);
    const Items = useSelector((state) => state.events);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const { items, actions, filteredItemsCount, collectionProps, propertyFilterProps, paginationProps } = useCollection(
        Items.items,
        {
            propertyFiltering: {
                filteringProperties: [
                    {
                        propertyLabel: "Event ID",
                        key: "id",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "Name",
                        key: "eventName",
                        operators: [":", "!:", "=", "!="]
                    },
                    {
                        propertyLabel: "Date",
                        key: "eventDate",
                        operators: [":", "!:", "=", "!=", "<", ">"]
                    },
                    {
                        propertyLabel: "Owner",
                        key: "eventOwner",
                        operators: ["=", "!=", ":", "!:"]
                    },
                    {
                        propertyLabel: "Duration",
                        key: "eventDays",
                        operators: ["=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Budget",
                        key: "eventBudget",
                        operators: ["=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Accounts",
                        key: "maxAccounts",
                        operators: ["=", "!=", ">", "<"]
                    },
                    {
                        propertyLabel: "Created",
                        key: "createdOn",
                        operators: ["=", "!=", ":", "!:", ">", "<"]
                    }
                ],
                empty: (
                    <EmptyState
                        title="No events"
                        subtitle="No events found."
                        action={
                            <Button onClick={() => dispatch({ type: "modal/open", status: "createEvent" })}>
                                Create event
                            </Button>
                        }
                    />
                ),
                noMatch: (
                    <EmptyState
                        title="No matches"
                        subtitle="We cannot find a matching event."
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
        const refreshTimer = setInterval(() => {
            dispatch(fetchEvents(false));
        }, Config.UPDATE_WEBSITE_INTERVAL * 1000);
        return () => clearInterval(refreshTimer);
    }, [dispatch, Config]);

    useEffect(() => {
        dispatch(fetchEvents());
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
                        header: "Event ID",
                        sortingField: "id",
                        cell: (item) => <Link href={"#/events/" + item.id}>{item.id}</Link>
                    },
                    {
                        id: "eventName",
                        header: "Name",
                        sortingField: "eventName",
                        cell: (item) => item.eventName
                    },
                    {
                        id: "eventDate",
                        header: "Start date",
                        sortingField: "eventDate",
                        cell: (item) => item.eventDate
                    },
                    {
                        id: "eventDays",
                        header: "Duration",
                        sortingField: "eventDays",
                        cell: (item) => (item.eventDays > 0 ? item.eventDays + "d " : "") + item.eventHours + "h"
                    },
                    {
                        id: "eventStatus",
                        header: "Status",
                        sortingField: "eventStatus",
                        cell: (item) => toIconColorBox(item.eventStatus)
                    },
                    {
                        id: "maxAccounts",
                        header: "Accounts",
                        sortingField: "maxAccounts",
                        cell: (item) => item.maxAccounts
                    },
                    {
                        id: "eventSpend",
                        header: "Current spend",
                        sortingField: "eventSpend",
                        cell: (item) => item.eventSpend + " USD"
                    }
                ]}
                items={items}
                selectionType="multi"
                header={
                    <Header
                        variant="h1"
                        selectedItems={collectionProps.selectedItems}
                        counter={"(" + Items.items.length + ")"}
                        actions={
                            <SpaceBetween direction="horizontal" size="xs">
                                <Button iconName="refresh" onClick={refreshNow} />
                                <Button
                                    disabled={collectionProps.selectedItems.length !== 1}
                                    onClick={() => navigate("/events/" + collectionProps.selectedItems[0].id)}
                                >
                                    Operate event
                                </Button>
                                <ButtonDropdown
                                    items={[
                                        {
                                            text: "Start",
                                            id: "start",
                                            disabled:
                                                collectionProps.selectedItems.length !== 1 ||
                                                collectionProps.selectedItems[0].eventStatus !== "Waiting"
                                        },
                                        {
                                            text: "Edit",
                                            id: "edit",
                                            disabled:
                                                collectionProps.selectedItems.length !== 1 ||
                                                collectionProps.selectedItems[0].eventStatus === "Terminated"
                                        },
                                        {
                                            text: "Terminate",
                                            id: "terminate",
                                            disabled:
                                                collectionProps.selectedItems.length !== 1 ||
                                                collectionProps.selectedItems[0].eventStatus === "Terminated"
                                        },
                                        {
                                            text: "Delete",
                                            id: "delete",
                                            disabled:
                                                collectionProps.selectedItems.length !== 1 ||
                                                collectionProps.selectedItems[0].eventStatus !== "Terminated"
                                        }
                                    ]}
                                    onItemClick={({ detail }) => {
                                        switch (detail.id) {
                                            case "start":
                                                dispatch({
                                                    type: "modal/open",
                                                    status: "startEvent",
                                                    item: collectionProps.selectedItems[0]
                                                });
                                                break;
                                            case "terminate":
                                                dispatch({
                                                    type: "modal/open",
                                                    status: "terminateEvent",
                                                    item: collectionProps.selectedItems[0]
                                                });
                                                break;
                                            case "edit":
                                                dispatch({
                                                    type: "modal/open",
                                                    status: "editEvent",
                                                    item: collectionProps.selectedItems[0]
                                                });
                                                break;
                                            case "delete":
                                                dispatch({
                                                    type: "modal/open",
                                                    status: "deleteEvent",
                                                    item: collectionProps.selectedItems[0]
                                                });
                                                break;
                                            default:
                                        }
                                    }}
                                >
                                    Actions
                                </ButtonDropdown>
                                <Button
                                    variant="primary"
                                    onClick={() => dispatch({ type: "modal/open", status: "createEvent" })}
                                    data-testid="createEventRow"
                                >
                                    Create event
                                </Button>
                            </SpaceBetween>
                        }
                    >
                        Events
                    </Header>
                }
                filter={
                    <PropertyFilter
                        {...propertyFilterProps}
                        i18nStrings={PropertyFilteri18nStrings}
                        filteringPlaceholder="Find events"
                        countText={filteredItemsCount + " match" + (filteredItemsCount === 1 ? "" : "es")}
                    />
                }
                pagination={<Pagination {...paginationProps} ariaLabels={paginationLabels} />}
                loading={Items.status === "loading"}
            />
            <EventModals />
        </Box>
    );
};

////////////////
// SPLIT PANEL
////////////////

const DetailSplitPanel = () => {
    const events = useSelector((state) => state.events);
    const leases = useSelector((state) => state.leases);
    const selection = useSelector((state) => state.selection);
    const [item, setItem] = useState({});
    const [EventLeases, setEventLeases] = useState([]);
    const [awsLoginUrl, setAwsLoginUrl] = useState("");
    const Config = useSelector((state) => state.config);
    const { items, collectionProps } = useCollection(EventLeases, {
        filtering: {},
        pagination: { pageSize: Config.SUBITEM_PAGE_SIZE },
        sorting: {}
    });

    useEffect(() => {
        if (selection.status === "selected") {
            setItem(events.items.find((event) => event.id === selection.id) ?? {});
            setAwsLoginUrl(window.location.protocol + "//" + window.location.host + "/#/login/" + selection.id);
            setEventLeases(
                leases.items.filter((leaseItem) => leaseItem.principalId.substring(0, Config.EVENT_ID_LENGTH) === selection.id)
            );
        }
    }, [selection, events, leases, Config]);

    return selection.id ? (
        <SplitPanel
            header={'Event: "' + item.eventName + '"'}
            i18nStrings={SplitPaneli18nStrings}
            hidePreferencesButton
            data-testid="splitPanel"
        >
            <ColumnLayout columns={4}>
                <Box>
                    <Box variant="h5">Login link for event attendees</Box>
                    <CopyClipboardIconButton content={awsLoginUrl}>
                        {awsLoginUrl.length > 40 ? awsLoginUrl.substring(0, 39) + "..." : awsLoginUrl}
                    </CopyClipboardIconButton>
                </Box>
                <Box>
                    <Box variant="h5">Event ID</Box>
                    <CopyClipboardIconButton content={item.id}>
                        <Link href={"#/events/" + item.id}>{item.id}</Link>
                    </CopyClipboardIconButton>
                </Box>
                <Box>
                    <Box variant="h5">Event start date</Box>
                    {item.eventDate}
                </Box>
                <Box>
                    <Box variant="h5">Event duration</Box>
                    {(item.eventDays > 0 ? item.eventDays + "d " : "") +
                        item.eventHours +
                        "h (" +
                        moment
                            .unix(item.eventOn)
                            .add(item.eventDays, "days")
                            .add(item.eventHours, "hours")
                            .format(Config.FORMAT_DATETIME) +
                        ")"}
                </Box>
                <Box>
                    <Box variant="h5">Maximum number of AWS accounts</Box>
                    {item.maxAccounts}
                </Box>
                <Box>
                    <Box variant="h5">Terminated AWS accounts</Box>
                    {item.terminatedAccounts}
                </Box>
                <Box>
                    <Box variant="h5">Leased AWS accounts</Box>
                    {item.leasedAccounts}
                </Box>
                <Box>
                    <Box variant="h5">Free AWS accounts</Box>
                    {item.freeAccounts}
                </Box>
                <Box>
                    <Box variant="h5">Maximum budget per AWS account</Box>
                    {item.eventBudget + " USD"}
                </Box>
                <Box>
                    <Box variant="h5">Current overall spend</Box>
                    {item.eventSpend + " USD"}
                </Box>
                <Box>
                    <Box variant="h5">Created on</Box>
                    {item.createdDate}
                </Box>
                <Box>
                    <Box variant="h5">Owner</Box>
                    <CopyClipboardIconButton content={item.eventOwner}>
                        <Link href={"mailto:" + item.eventOwner}>{item.eventOwner}</Link>
                    </CopyClipboardIconButton>
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
                            <Box variant="p">No leases found for event {item.id}.</Box>
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

const OverviewEvents = () => {
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
                        { text: "Events", href: "#/events" }
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

const SideHelp = () => {
    const Config = useSelector((state) => state.config);
    return (
        <HelpPanel header={<h2>Sandbox Accounts for Events</h2>}>
            <Box>
                <Header variant="h3">Event List</Header>
                <SpaceBetween size="m">
                    <Box>
                        Events allow operators to provide multiple AWS accounts with a single login link. An 
                        event can have three states:
                    </Box>
                    <Box>
                        <strong>Waiting</strong>
                        <br />
                        Event hasn't been started yet, user can not retrieve leases to log into their AWS accounts. You
                        can start the event early manually or let it autostart from the event start timestamp.
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
                        Event has been terminated, this can not be reverted back to a previous state. Users can not
                        retrieve leases any more, leases all have been terminated as well, AWS account cleanup process
                        is in progress or already finished.
                    </Box>
                </SpaceBetween>
            </Box>
            <hr />
            <Box>
                <Header variant="h3">Limitations</Header>
                <ul>
                    <li>
                        You cannot delete an event that is in "Running" state. Terminate the event first, then delete
                        it.
                    </li>
                    <li>Event lifetime is limited to {Config.EVENT_MAX_DAYS} days maximum.</li>
                    <li>Event budget is limited to USD {Config.ACCOUNT_MAX_BUDGET} maximum per AWS account.</li>
                    <li>Events are limited to {Config.EVENT_MAX_ACCOUNTS} AWS accounts maximum.</li>
                </ul>
            </Box>
            <hr />
            <GitHubLinks/>
        </HelpPanel>
    );
};

export default OverviewEvents;
