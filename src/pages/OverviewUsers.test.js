import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OverviewUsers from "./OverviewUsers";
import * as redux from "react-redux";
import store from "../redux/store";
import * as userActions from "../redux/actions/users";
import * as leaseActions from "../redux/actions/leases";
import moment from "moment";

const ReduxProvider = ({ children, reduxStore }) => <redux.Provider store={reduxStore}>{children}</redux.Provider>;

test("renders OverviewUsers, enters valid and invalid texts, submits", async () => {

    const config = store.getState().config
    const testUser = {
        Username: "testusername",
        Attributes: [{
            Name: "email",
            Value: "testuser@domain.org"
        }],
        isOperator: true,
        isAdmin: false,
        UserCreateDate: "2022-01-01T10:00:00.000Z",
        UserLastModifiedDate: "2022-01-01T20:00:00.000Z",
        UserStatus: "CONFIRMED"
    }
    testUser.createdDate = moment(testUser.UserCreateDate).format(config.FORMAT_DATETIME)
    testUser.lastModifiedDate = moment(testUser.UserLastModifiedDate).format(config.FORMAT_DATETIME)

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

    const fetchLeasesAction = jest.spyOn(leaseActions, "fetchLeases").mockImplementation((leases) => () => leases)
    const fetchUsersAction = jest.spyOn(userActions, "fetchUsers").mockImplementation((users) => () => users)
    store.dispatch({ type: "users/loaded", payload: [testUser], addUsers: false, config })
    store.dispatch({ type: "leases/loaded", payload: [testLease], config })
    render(
        <ReduxProvider reduxStore={store}>
            <OverviewUsers/>
        </ReduxProvider>
    );
    const searchInputElement = screen.getByPlaceholderText(/search/i);
    const createButtonElement = screen.getByTestId("createUserRow")
    const editButtonElement = screen.getByTestId("editUserRow")
    const deleteButtonElement = screen.getByTestId("deleteUserRow")

    // check which buttons are initially enabled
    expect(createButtonElement).toBeEnabled()
    expect(editButtonElement).toBeDisabled()
    expect(deleteButtonElement).toBeDisabled()

    // check if user and lease data has been fetched
    expect(fetchLeasesAction).toBeCalled()
    expect(fetchUsersAction).toBeCalled()

    // check if search box filters correctly
    await userEvent.type(searchInputElement, 'unknown')
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})
    const clearButtonElements = screen.getAllByRole("button", { name: "Clear filters" })
    expect(clearButtonElements).toHaveLength(2)
    await userEvent.click(clearButtonElements[0])
    await userEvent.type(searchInputElement, 'domain')
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})

    // check if testObject data is visible in table
    const userRow = screen.getByText(testUser.Attributes[0].Value).closest("tr");
    const withinUserRow = within(userRow)
    expect(withinUserRow.getByText(testUser.UserStatus)).toBeInTheDocument()
    expect(withinUserRow.getByText(testUser.createdDate)).toBeInTheDocument()
    expect(withinUserRow.getByText(testUser.lastModifiedDate)).toBeInTheDocument()

    // check table row to toggle buttons
    await userEvent.click(withinUserRow.getByRole("checkbox"))
    expect(editButtonElement).toBeEnabled()
    expect(deleteButtonElement).toBeEnabled()

    // check if details tab opens
    const splitPanel = screen.getByTestId("splitPanel");
    const withinSplitPanel = within(splitPanel)
    expect(withinSplitPanel.getByText(/user details/i)).toBeInTheDocument();
    expect(withinSplitPanel.getAllByText(testUser.Attributes[0].Value)).toHaveLength(2)
    expect(withinSplitPanel.getByText(testUser.UserStatus)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testUser.createdDate)).toBeInTheDocument()
    expect(withinSplitPanel.getByText(testUser.lastModifiedDate)).toBeInTheDocument()
    expect(withinSplitPanel.getByText("Operator")).toBeInTheDocument()
    expect(withinSplitPanel.queryByText("Administrator")).not.toBeInTheDocument()

    // check if lease table shows correct lease details
    const leaseRow = withinSplitPanel.getByText(testLease.accountId).closest("tr");
    const withinLeaseRow = within(leaseRow)
    expect(withinLeaseRow.getByText(testLease.id.slice(-12))).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.budgetNotificationEmails[0])).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.leaseStatus)).toBeInTheDocument()
    expect(withinLeaseRow.getByText(testLease.principalId.slice(0,10))).toBeInTheDocument()
    expect(withinLeaseRow.getByText("expires on " + moment.unix(testLease.expiresOn).format(config.FORMAT_DATETIME))).toBeInTheDocument()
});
