import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OverviewAccounts from "./OverviewAccounts";
import * as redux from "react-redux";
import store from "../redux/store";
import * as accountActions from "../redux/actions/accounts";
import * as leaseActions from "../redux/actions/leases";
import moment from "moment";

const ReduxProvider = ({ children, reduxStore }) => <redux.Provider store={reduxStore}>{children}</redux.Provider>;

test("renders OverviewAccounts, enters valid and invalid texts, submits", async () => {

    const config = store.getState().config
    const testAccount = {
        id: "112233445566",
        accountStatus: "Ready",
        createdOn: moment("2099-01-01T00:00:00Z").unix(),
        lastModifiedOn: moment("2099-01-03T00:00:00Z").unix(),
        adminRoleArn: "arn:aws:iam::112233445566:role/DCEAdmin",
        principalRoleArn: "arn:aws:iam::112233445566:role/DCEPrincipal-dce"
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
        spendAmount: 0,
        spendPercent: 0
    }

    const fetchAccountsAction = jest.spyOn(accountActions, "fetchAccounts").mockImplementation((accounts) => () => accounts)
    const fetchLeasesAction = jest.spyOn(leaseActions, "fetchLeases").mockImplementation((leases) => () => leases)
    store.dispatch({ type: "leases/loaded", payload: [testLease], config })
    store.dispatch({ type: "accounts/loaded", payload: [testAccount], config })
    render(
        <ReduxProvider reduxStore={store}>
            <OverviewAccounts/>
        </ReduxProvider>
    );
    const searchInputElement = screen.getByPlaceholderText(/search/i);
    const registerButtonElement = screen.getByTestId("registerAccountRow")
    const editButtonElement = screen.getByTestId("editAccountRow")
    const removeButtonElement = screen.getByTestId("removeAccountRow")

    // check which buttons are initially enabled
    expect(registerButtonElement).toBeEnabled()
    expect(editButtonElement).toBeDisabled()
    expect(removeButtonElement).toBeDisabled()

    // check if lease data has been fetched
    expect(fetchLeasesAction).toBeCalled()
    expect(fetchAccountsAction).toBeCalled()

    // check if search box filters correctly
    await userEvent.type(searchInputElement, '123456789123')
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})
    const clearButtonElements = screen.getAllByRole("button", { name: "Clear filters" })
    expect(clearButtonElements).toHaveLength(2)
    await userEvent.click(clearButtonElements[0])
    await userEvent.type(searchInputElement, testAccount.id.slice(0,6))
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})

    // check if testObject data is visible in table
    const accountRow = screen.getByText(testAccount.id).closest("tr");
    const withinAccountRow = within(accountRow)
    expect(withinAccountRow.getByText(testAccount.id.slice(-12))).toBeInTheDocument()
    expect(withinAccountRow.getByText(testAccount.accountStatus)).toBeInTheDocument()
    expect(withinAccountRow.getByText(testAccount.adminRoleArn.split("/")[1])).toBeInTheDocument()
    expect(withinAccountRow.getByText(testAccount.principalRoleArn.split("/")[1])).toBeInTheDocument()
    expect(withinAccountRow.getByText(moment.unix(testAccount.createdOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()
    expect(withinAccountRow.getByText(moment.unix(testAccount.lastModifiedOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()

    // check table row to toggle buttons
    await userEvent.click(withinAccountRow.getByRole("checkbox"))
    expect(editButtonElement).toBeEnabled()
    expect(removeButtonElement).toBeEnabled()

    // check if details tab opens
    const splitPanel = screen.getByTestId("splitPanel");
    const withinSplitPanel = within(splitPanel)
    expect(withinSplitPanel.getByText(/account details/i)).toBeInTheDocument();
    expect(withinSplitPanel.getAllByText(testAccount.id)).toHaveLength(2)
    expect(withinSplitPanel.getByText(testAccount.accountStatus)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testAccount.adminRoleArn)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testAccount.principalRoleArn)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(moment.unix(testAccount.createdOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()
    expect(withinSplitPanel.getByText(moment.unix(testAccount.lastModifiedOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()

    // check if lease table shows correct lease details
    const leaseRow = withinSplitPanel.getByText(testLease.id.slice(-12)).closest("tr");
    const withinLeaseRow = within(leaseRow)
    expect(withinLeaseRow.getByText(testLease.accountId)).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.budgetNotificationEmails[0])).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.leaseStatus)).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.principalId.slice(0,10))).toBeInTheDocument()
    expect(withinLeaseRow.getByText("expires on " + moment.unix(testLease.expiresOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()

});
