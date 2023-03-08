import { render, screen, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OverviewUsage from "./OverviewUsage";
import { HashRouter } from "react-router-dom";
import * as redux from "react-redux";
import * as usageActions from "../redux/actions/usage";
import store from "../redux/store";
import moment from "moment";

const ReduxProvider = ({ children, reduxStore }) => <redux.Provider store={reduxStore}>{children}</redux.Provider>;

test("renders OverviewUsage, enters valid and invalid search term", async () => {

    const config = store.getState().config
    const testUsage = {
        startDate: moment("2020-01-01T00:00:00Z").unix(),
        principalId: "a1b2c3d4e5__t+l+d",
        user: "testuser@domain.org",
        accountId: "112233445566",
        costAmount: 10
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

    const fetchUsageAction = jest.spyOn(usageActions, "fetchUsage").mockImplementation((usage) => () => usage)
    store.dispatch({ type: "usage/loaded", payload: [testUsage], config })
    store.dispatch({ type: "leases/loaded", payload: [testLease], config })
    render(
        <ReduxProvider reduxStore={store}>
            <HashRouter>
            <OverviewUsage/>
            </HashRouter>
        </ReduxProvider>
    );

    expect(screen.getByText(/daily aws account lease spend/i)).toBeInTheDocument()
    const searchInputElement = screen.getByPlaceholderText(/search/i);

    // check if event data has been fetched
    expect(fetchUsageAction).toBeCalled()

    // check if search box filters correctly
    await userEvent.type(searchInputElement, 'invalid')
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})
    const clearButtonElements = screen.getAllByRole("button", { name: /clear filters/i })
    expect(clearButtonElements).toHaveLength(2)
    await userEvent.click(clearButtonElements[0])
    await userEvent.type(searchInputElement, testUsage.accountId)
    fireEvent.keyDown(searchInputElement, {key: 'enter', keyCode: 13})

    // check if testObject data is visible in table
    const usageRow = screen.getByText(testUsage.accountId).closest("tr");
    const withinUsageRow = within(usageRow)
    expect(withinUsageRow.getByText(moment.unix(testUsage.startDate).format(config.FORMAT_DATE))).toBeInTheDocument()
    expect(withinUsageRow.getByText(testUsage.principalId.substring(0,config.EVENT_ID_LENGTH))).toBeInTheDocument()
    expect(withinUsageRow.getByText(testUsage.user)).toBeInTheDocument()
    expect(withinUsageRow.getByText(testUsage.costAmount.toFixed(2) + " USD")).toBeInTheDocument()
});
