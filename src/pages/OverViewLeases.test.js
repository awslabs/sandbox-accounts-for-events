import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OverviewLeases from "./OverviewLeases";
import * as redux from "react-redux";
import store from "../redux/store";
import * as leaseActions from "../redux/actions/leases";
import moment from "moment";

const ReduxProvider = ({ children, reduxStore }) => <redux.Provider store={reduxStore}>{children}</redux.Provider>;

test("renders OverviewLeases, enters valid and invalid texts, submits", async () => {

    const config = store.getState().config
    const testLease = {
        id: "1a2b3c4d-1234-1234-1a2b-1a2b3c4d5e6f",
        leaseStatus: "Inactive",
        leaseStatusReason: "Destroyed",
        principalId: "a1b2c3d4e5__t+l+d",
        expiresOn: moment("2099-01-10T00:00:00Z").unix(),
        createdOn: moment("2099-01-01T00:00:00Z").unix(),
        lastModifiedOn: moment("2099-01-03T00:00:00Z").unix(),
        leaseStatusModifiedOn: moment("2099-01-04T00:00:00Z").unix(),
        budgetNotificationEmails: ["testuser@domain.org"],
        accountId: "112233445566",
        budgetAmount: 10,
        spendAmount: "0.00",
        spendPercent: 0
    }

    const fetchLeasesAction = jest.spyOn(leaseActions, "fetchLeases").mockImplementation((leases) => () => leases)
    store.dispatch({ type: "leases/loaded", payload: [testLease], config })
    render(
        <ReduxProvider reduxStore={store}>
            <OverviewLeases/>
        </ReduxProvider>
    );
    const searchInputElement = screen.getByPlaceholderText(/search/i);
    const createButtonElement = screen.getByTestId("createLeaseRow")
    const editButtonElement = screen.getByTestId("editLeaseRow")
    const terminateButtonElement = screen.getByTestId("terminateLeaseRow")
    const deleteButtonElement = screen.getByTestId("deleteLeaseRow")

    // check which buttons are initially enabled
    expect(createButtonElement).toBeEnabled()
    expect(editButtonElement).toBeDisabled()
    expect(deleteButtonElement).toBeDisabled()
    expect(terminateButtonElement).toBeDisabled()

    // check if lease data has been fetched
    expect(fetchLeasesAction).toBeCalled()

    // check if search box filters correctly
    await userEvent.type(searchInputElement, 'unknown')
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})
    const clearButtonElements = screen.getAllByRole("button", { name: "Clear filters" })
    expect(clearButtonElements).toHaveLength(2)
    await userEvent.click(clearButtonElements[0])
    await userEvent.type(searchInputElement, 'domain')
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})

    // check if testObject data is visible in table
    const leaseRow = screen.getByText(testLease.accountId).closest("tr");
    const withinLeaseRow = within(leaseRow)
    expect(withinLeaseRow.getByText(testLease.id.slice(-12))).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.budgetNotificationEmails[0])).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.leaseStatus)).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.principalId.slice(0,10))).toBeInTheDocument()
    expect(withinLeaseRow.getByText("manually terminated")).toBeInTheDocument()

    // check table row to toggle buttons
    await userEvent.click(withinLeaseRow.getByRole("checkbox"))
    expect(editButtonElement).toBeEnabled()
    expect(terminateButtonElement).toBeEnabled()
    expect(deleteButtonElement).toBeEnabled() // as lease is still active

    // check if details tab opens
    const splitPanel = screen.getByTestId("splitPanel");
    const withinSplitPanel = within(splitPanel)
    expect(withinSplitPanel.getByText(/lease details/i)).toBeInTheDocument();
    expect(withinSplitPanel.getByText(testLease.budgetNotificationEmails[0])).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testLease.leaseStatus)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(moment.unix(testLease.createdOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()
    expect(withinSplitPanel.getByText(moment.unix(testLease.expiresOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()
    expect(withinSplitPanel.getByText(moment.unix(testLease.lastModifiedOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()
    expect(withinSplitPanel.getByText(moment.unix(testLease.leaseStatusModifiedOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testLease.leaseStatusReason)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testLease.budgetAmount)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testLease.spendAmount)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testLease.principalId)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testLease.accountId)).toBeInTheDocument()
});
