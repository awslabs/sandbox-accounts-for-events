import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DetailEvent from "./DetailEvent";
import { HashRouter } from "react-router-dom";
import * as redux from "react-redux";
import store from "../redux/store";
import * as eventActions from "../redux/actions/events";
import moment from "moment";

const ReduxProvider = ({ children, reduxStore }) => <redux.Provider store={reduxStore}>{children}</redux.Provider>;

test("renders DetailEvent, enters valid and invalid texts, submits", async () => {

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

    const fetchEventAction = jest.spyOn(eventActions, "fetchEvent").mockImplementation((events) => () => events)
    store.dispatch({ type: "event/loaded", event: testEvent, leases: [testLease], config })
    store.dispatch({ type: "leases/loaded", payload: [testLease], config })
    render(
        <ReduxProvider reduxStore={store}>
            <HashRouter>
            <DetailEvent/>
            </HashRouter>
        </ReduxProvider>
    );

    // check if actions menu is active
    expect(screen.getByText(/event details/i)).toBeInTheDocument();
    const actionsButtonElement = screen.getByRole("button", { name: /actions/i })
    await userEvent.click(actionsButtonElement)
    expect(screen.getByRole("menuitem", { name: /start/i })).toBeInTheDocument
    expect(screen.getByRole("menuitem", { name: /edit/i })).toBeInTheDocument
    expect(screen.getByRole("menuitem", { name: /terminate/i })).toBeInTheDocument
   

    // check leases table
    expect(screen.getByText(/leased aws accounts/i)).toBeInTheDocument();
    const searchInputElement = screen.getByPlaceholderText(/search/i);
    const createLeaseButtonElement = screen.getByTestId("createLeaseRow")
    const editLeaseButtonElement = screen.getByTestId("editLeaseRow")
    const terminateLeaseButtonElement = screen.getByTestId("terminateLeaseRow")
    const deleteLeaseButtonElement = screen.getByTestId("deleteLeaseRow")

    // check which buttons are initially enabled
    expect(createLeaseButtonElement).toBeEnabled()

    // check if event data has been fetched
    expect(fetchEventAction).toBeCalled()

    // check if search box filters correctly
    await userEvent.type(searchInputElement, 'invalid')
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})
    const clearButtonElements = screen.getAllByRole("button", { name: "Clear filters" })
    expect(clearButtonElements).toHaveLength(2)
    await userEvent.click(clearButtonElements[0])
    await userEvent.type(searchInputElement, "test")
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})

    // check if details data is correct
    const detailPanel = screen.getByTestId("detailPanel");
    const withinDetailPanel = within(detailPanel)
    expect(withinDetailPanel.getByText(testEvent.id)).toBeInTheDocument()
    expect(withinDetailPanel.getByText(moment.unix(testEvent.eventOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()
    expect(withinDetailPanel.getByText(testEvent.eventBudget + " USD")).toBeInTheDocument()
    let durationString = (testEvent.eventDays > 0 ? testEvent.eventDays + "d " : "") +
    testEvent.eventHours + "h (" + moment.unix(testEvent.eventOn).add(testEvent.eventDays, "days").add(testEvent.eventHours, "hours").format(config.FORMAT_DATETIME) + ")"
    expect(withinDetailPanel.getByText(durationString)).toBeInTheDocument()
    expect(withinDetailPanel.getByText(moment(testEvent.createdAt).format(config.FORMAT_DATETIME))).toBeInTheDocument()
    expect(withinDetailPanel.getByText(testEvent.eventOwner)).toBeInTheDocument()

    // check table row to toggle buttons
    const leaseRow = screen.getByText(testLease.accountId).closest("tr");
    const withinLeaseRow = within(leaseRow)
    await userEvent.click(withinLeaseRow.getByRole("checkbox"))
    await userEvent.click(actionsButtonElement)
    expect(editLeaseButtonElement).toBeEnabled()
    expect(terminateLeaseButtonElement).toBeEnabled()
    expect(deleteLeaseButtonElement).toBeDisabled()

    // check if lease table shows correct lease details
    expect(withinLeaseRow.getByText(testLease.budgetNotificationEmails[0])).toBeInTheDocument()
    expect(withinLeaseRow.getByText("expires on " + moment.unix(testLease.expiresOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()

});
