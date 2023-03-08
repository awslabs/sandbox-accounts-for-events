import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateLeaseModal from "./CreateLeaseModal";
import { Provider } from "react-redux";
import store from "../../redux/store";
import * as actions from "../../redux/actions/leases";

const ReduxProvider = ({ children, reduxStore }) => <Provider store={reduxStore}>{children}</Provider>;

test("renders CreateLeaseModal, cannot submit empty dialog", async () => {

    render(
        <ReduxProvider reduxStore={store}>
            <CreateLeaseModal />
        </ReduxProvider>
    );
    const createButtonElement = screen.getByRole("button", { name: "Create" })

    expect(screen.getByText(/create new lease/i)).toBeInTheDocument();

    expect(createButtonElement).toBeEnabled()
    await userEvent.click(createButtonElement)
    expect(createButtonElement).toBeDisabled()
});

test("renders CreateLeaseModal, enters valid and invalid texts, submits", async () => {

    const testObject = {
        user: 'testuser@domain.org',
        eventId: 'a1b2c3d4e5',
        budgetAmount: '10',
        expiryDays: '10',
        expiryHours: '10',
    }
    testObject.budgetNotificationEmails= [testObject.user]
    render(
        <ReduxProvider reduxStore={store}>
            <CreateLeaseModal isAdminView/>
        </ReduxProvider>
    );
    expect(screen.getByText(/create new lease/i)).toBeInTheDocument();
    const userInputElement = screen.getByLabelText(/user email address/i);
    const expirationDaysInputElement = screen.getByPlaceholderText("0");
    const expirationHoursInputElement = screen.getByPlaceholderText("8");
    const eventIdInputElement = screen.getByLabelText(/event id/i);
    const budgetInputElement = screen.getByLabelText(/budget in usd/i);
    const createButtonElement = screen.getByRole("button", { name: "Create" })

    // check if submit button is initially enabled
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid email address
    await userEvent.type(userInputElement, "testowner")
    expect(createButtonElement).toBeDisabled()
    await userEvent.clear(userInputElement)
    await userEvent.type(userInputElement, testObject.user)
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid budget
    await userEvent.type(budgetInputElement, '5a')
    expect(createButtonElement).toBeDisabled()
    await userEvent.clear(budgetInputElement)
    await userEvent.type(budgetInputElement, testObject.budgetAmount)
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid expiration period
    await userEvent.type(expirationDaysInputElement, testObject.expiryDays)
    await userEvent.type(expirationHoursInputElement, '25')
    expect(createButtonElement).toBeDisabled()
    await userEvent.clear(expirationHoursInputElement)
    await userEvent.type(expirationHoursInputElement, testObject.expiryHours)
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid event id
    await userEvent.type(eventIdInputElement, 'abcdef?#abc')
    expect(createButtonElement).toBeDisabled()
    await userEvent.clear(eventIdInputElement)
    await userEvent.type(eventIdInputElement, testObject.eventId)
    expect(createButtonElement).toBeEnabled()

    // submit and test redux action call payload
    const createLeaseAction = jest.spyOn(actions, "createLease").mockImplementation((event) => () => event)
    await userEvent.click(createButtonElement)
    expect(createLeaseAction.mock.lastCall[0]).toMatchObject(testObject)
});
