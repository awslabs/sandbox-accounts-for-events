import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OverviewEvents from "./OverviewEvents";
import { HashRouter } from "react-router-dom";
import * as redux from "react-redux";
import store from "../redux/store";
import * as eventActions from "../redux/actions/events";
import moment from "moment";

const ReduxProvider = ({ children, reduxStore }) => <redux.Provider store={reduxStore}>{children}</redux.Provider>;

test("renders OverviewEvents, enters valid and invalid texts, submits", async () => {

    const config = store.getState().config
    const testEvent = {
        id: "a1b2c3d4e5",
        eventName: "testname",
        eventStatus: "Running",
        eventOwner: "testowner@domain.org",
        eventOn: moment("2099-01-05T00:00:00Z").unix(),
        createdAt: "2099-01-02T00:00:00Z",
        eventDays: 6,
        eventHours: 12,
        maxAccounts: 3,
        eventSpend: 2,
        eventBudget: 10
    }
    const testLease = {
        id: "1a2b3c4d-1234-1234-1a2b-1a2b3c4d5e6f",
        leaseStatus: "Active",
        leaseStatusReason: "Active",
        principalId: "a1b2c3d4e5__t+l+d",
        expiresOn: moment("2099-01-10T00:00:00Z").unix(),
        createdOn: moment("2099-01-01T00:00:00Z").unix(),
        lastModifiedOn: moment("2099-01-03T00:00:00Z").unix(),
        leaseStatusModifiedOn: moment("2099-01-03T00:00:00Z").unix(),
        budgetNotificationEmails: ["testuser@domain.org"],
        accountId: "112233445566",
        budgetAmount: 10,
        spendAmount: 2,
        spendPercent: 0
    }

    const fetchEventsAction = jest.spyOn(eventActions, "fetchEvents").mockImplementation((events) => () => events)
    store.dispatch({ type: "events/loaded", events: [testEvent], leases: [testLease], config })
    store.dispatch({ type: "leases/loaded", payload: [testLease], config })
    render(
        <ReduxProvider reduxStore={store}>
            <HashRouter>
            <OverviewEvents/>
            </HashRouter>
        </ReduxProvider>
    );
    const searchInputElement = screen.getByPlaceholderText(/search/i);
    const actionsButtonElement = screen.getByRole("button", { name: /actions/i })
    const operateButtonElement = screen.getByRole("button", { name: /operate/i })
    const createButtonElement = screen.getByTestId("createEventRow")

    // check which buttons are initially enabled
    expect(createButtonElement).toBeEnabled()
    expect(operateButtonElement).toBeDisabled()

    // open Actions menu and check which menu items are enabled
    await userEvent.click(actionsButtonElement)
    expect(screen.getByRole("menuitem", { name: /edit/i })).toBeInTheDocument
    expect(screen.getByRole("menuitem", { name: /delete/i })).toBeInTheDocument
    expect(screen.getByRole("menuitem", { name: /start/i })).toBeInTheDocument
    expect(screen.getByRole("menuitem", { name: /terminate/i })).toBeInTheDocument

    // check if event data has been fetched
    expect(fetchEventsAction).toBeCalled()

    // check if search box filters correctly
    await userEvent.type(searchInputElement, 'invalid')
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})
    const clearButtonElements = screen.getAllByRole("button", { name: "Clear filters" })
    expect(clearButtonElements).toHaveLength(2)
    await userEvent.click(clearButtonElements[0])
    await userEvent.type(searchInputElement, testEvent.eventName)
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})

    // check if testObject data is visible in table
    const eventRow = screen.getByText(testEvent.id).closest("tr");
    const withinEventRow = within(eventRow)
    expect(withinEventRow.getByText(testEvent.eventStatus)).toBeInTheDocument()
    expect(withinEventRow.getByText(moment.unix(testEvent.eventOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()

    // check table row to toggle buttons
    await userEvent.click(withinEventRow.getByRole("checkbox"))
    await userEvent.click(actionsButtonElement)
    expect(operateButtonElement).toBeEnabled()

    // check if details tab opens
    const splitPanel = screen.getByTestId("splitPanel");
    const withinSplitPanel = within(splitPanel)
    expect(withinSplitPanel.getByText(/event: "/i)).toBeInTheDocument();
    expect(withinSplitPanel.getAllByText(testEvent.id)).toHaveLength(2)
    expect(withinSplitPanel.getByText(moment.unix(testEvent.eventOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testEvent.maxAccounts)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testEvent.eventBudget + " USD")).toBeInTheDocument()
    let durationString = (testEvent.eventDays > 0 ? testEvent.eventDays + "d " : "") +
    testEvent.eventHours + "h (" + moment.unix(testEvent.eventOn).add(testEvent.eventDays, "days").add(testEvent.eventHours, "hours").format(config.FORMAT_DATETIME) + ")"
    expect(withinSplitPanel.getByText(durationString)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(moment(testEvent.createdAt).format(config.FORMAT_DATETIME))).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testEvent.eventOwner)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testEvent.eventSpend.toFixed(2) + " USD")).toBeInTheDocument()

    // check if lease table shows correct lease details
    const leaseRow = withinSplitPanel.getByText(testLease.id.slice(-12)).closest("tr");
    const withinLeaseRow = within(leaseRow)
    expect(withinLeaseRow.getByText(testLease.accountId)).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.budgetNotificationEmails[0])).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.leaseStatus)).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.principalId.substring(0, config.EVENT_ID_LENGTH))).toBeInTheDocument()
    expect(withinLeaseRow.getByText("expires on " + moment.unix(testLease.expiresOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()

});
