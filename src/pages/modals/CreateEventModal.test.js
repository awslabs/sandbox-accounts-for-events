import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    userEvent.click(createButtonElement)
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
    userEvent.type(nameInputElement, testObject.eventName)

    // try invalid and valid email address
    userEvent.type(ownerInputElement, "testowner")
    expect(createButtonElement).toBeDisabled()
    fireEvent.change(ownerInputElement, { target: { value: "" }})
    userEvent.type(ownerInputElement, testObject.eventOwner)
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid date
    userEvent.type(timeInputElement, testObject.eventTimeInput)
    userEvent.type(dateInputElement, '2021/01/01')
    expect(createButtonElement).toBeDisabled()
    fireEvent.change(dateInputElement, { target: { value: "" }})
    userEvent.type(dateInputElement, testObject.eventDateInput.split('-').join('/'))
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid duration
    fireEvent.change(durationDaysInputElement, { target: { value: "" }})
    userEvent.type(durationDaysInputElement, testObject.eventDays)
    userEvent.type(durationHoursInputElement, '25')
    expect(createButtonElement).toBeDisabled()
    fireEvent.change(durationHoursInputElement, { target: { value: "" }})
    userEvent.type(durationHoursInputElement, testObject.eventHours)
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid number of accounts
    userEvent.type(accountsInputElement, '5a')
    expect(createButtonElement).toBeDisabled()
    fireEvent.change(accountsInputElement, { target: { value: "" }})
    userEvent.type(accountsInputElement, testObject.maxAccounts)
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid budget
    userEvent.type(budgetInputElement, '5a')
    expect(createButtonElement).toBeDisabled()
    fireEvent.change(budgetInputElement, { target: { value: "" }})
    userEvent.type(budgetInputElement, testObject.eventBudget)
    expect(createButtonElement).toBeEnabled()

    // submit and test redux action call payload
    const createEventAction = jest.spyOn(actions, "createEvent").mockImplementation((event) => () => event)
    userEvent.click(createButtonElement)
    expect(createEventAction.mock.lastCall[0]).toMatchObject(testObject)
});
