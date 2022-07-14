import { render, screen, fireEvent } from "@testing-library/react";
import CreateEventModal from "./CreateEventModal";
import { Provider } from "react-redux";
import store from "../../redux/store";
import * as actions from "../../redux/actions/events";
import moment from "moment";

const ReduxProvider = ({ children, reduxStore }) => <Provider store={reduxStore}>{children}</Provider>;

test("renders CreateEventModal, cannot submit empty dialog", async () => {

    render(
        <ReduxProvider reduxStore={store}>
            <CreateEventModal />
        </ReduxProvider>
    );
    const createButtonElement = screen.getByRole("button", { name: "Create" })

    expect(screen.getByText(/create new event/i)).toBeInTheDocument();

    expect(createButtonElement).toBeEnabled()
    fireEvent.click(createButtonElement)
    expect(createButtonElement).toBeDisabled()
});

test("renders CreateEventModal, enters valid and invalid texts, submits", async () => {

    const testObject = {
        id: '',
        eventName: 'testname',
        eventOwner: 'testemail@domain.org',
        eventDays: '10',
        eventHours: '8',
        eventBudget: '10',
        maxAccounts: '10',
        eventDateInput: '2099-01-01',
        eventTimeInput: '10:00',
        eventStatus: 'Waiting'
    }
    testObject.eventOn = moment(testObject.eventDateInput + " " + testObject.eventTimeInput).unix()
    render(
        <ReduxProvider reduxStore={store}>
            <CreateEventModal />
        </ReduxProvider>
    );
    expect(screen.getByText(/create new event/i)).toBeInTheDocument();
    const nameInputElement = screen.getByLabelText(/event name/i);
    const dateInputElement = screen.getByPlaceholderText("YYYY/MM/DD");
    const timeInputElement = screen.getByPlaceholderText("00:00");
    const ownerInputElement = screen.getByLabelText(/event owner email address/i);
    const durationDaysInputElement = screen.getByPlaceholderText("0");
    const durationHoursInputElement = screen.getByPlaceholderText("8");
    const accountsInputElement = screen.getByLabelText(/maximum number of aws accounts/i);
    const budgetInputElement = screen.getByLabelText(/budget in usd/i);
    const createButtonElement = screen.getByRole("button", { name: "Create" })

    // check if submit button is initially enabled
    expect(createButtonElement).toBeEnabled()
    fireEvent.change(nameInputElement, {target: {value: testObject.eventName}})

    // try invalid and valid email address
    fireEvent.change(ownerInputElement, {target: {value: "testowner"}})
    expect(createButtonElement).toBeDisabled()
    fireEvent.change(ownerInputElement, {target: {value: testObject.eventOwner}})
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid date
    fireEvent.change(timeInputElement, {target: {value: testObject.eventTimeInput}})
    fireEvent.change(dateInputElement, {target: {value: '2021/01/01'}})
    expect(createButtonElement).toBeDisabled()
    fireEvent.change(dateInputElement, {target: {value: testObject.eventDateInput.split('-').join('/')}})
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid duration
    fireEvent.change(durationDaysInputElement, {target: {value: testObject.eventDays}})
    fireEvent.change(durationHoursInputElement, {target: {value: '25'}})
    expect(createButtonElement).toBeDisabled()
    fireEvent.change(durationHoursInputElement, {target: {value: testObject.eventHours}})
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid number of accounts
    fireEvent.change(accountsInputElement, {target: {value: '5a'}})
    expect(createButtonElement).toBeDisabled()
    fireEvent.change(accountsInputElement, {target: {value: testObject.maxAccounts}})
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid budget
    fireEvent.change(budgetInputElement, {target: {value: '5a'}})
    expect(createButtonElement).toBeDisabled()
    fireEvent.change(budgetInputElement, {target: {value: testObject.eventBudget}})
    expect(createButtonElement).toBeEnabled()

    // submit and test redux action call payload
    const createEventAction = jest.spyOn(actions, "createEvent").mockImplementation((event) => () => event)
    fireEvent.click(createButtonElement)
    expect(createEventAction.mock.lastCall[0]).toMatchObject(testObject)
});
