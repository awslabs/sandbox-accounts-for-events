import { render, screen, fireEvent } from "@testing-library/react";
import EditEventModal from "./EditEventModal";
import { Provider } from "react-redux";
import store from "../../redux/store";
import * as actions from "../../redux/actions/events";
import moment from "moment";

const ReduxProvider = ({ children, reduxStore }) => <Provider store={reduxStore}>{children}</Provider>;

test("renders EditEventModal, enters valid and invalid texts, submits", async () => {

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
    store.dispatch({ type: "modal/open", item: testObject })
    render(
        <ReduxProvider reduxStore={store}>
            <EditEventModal />
        </ReduxProvider>
    );

    expect(screen.getByText(/edit event/i)).toBeInTheDocument();
    const dateInputElement = screen.getByPlaceholderText("YYYY/MM/DD");
    const timeInputElement = screen.getByPlaceholderText("00:00");
    const ownerInputElement = screen.getByLabelText(/event owner email address/i);
    const durationDaysInputElement = screen.getByPlaceholderText("0");
    const durationHoursInputElement = screen.getByPlaceholderText("8");
    const accountsInputElement = screen.getByLabelText(/maximum number of aws accounts/i);
    const budgetInputElement = screen.getByLabelText(/budget in usd/i);
    const saveButtonElement = screen.getByRole("button", { name: "Save" })

    // check if submit button is initially enabled
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid email address
    fireEvent.change(ownerInputElement, {target: {value: "testowner"}})
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(ownerInputElement, {target: {value: testObject.eventOwner}})
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid date
    fireEvent.change(timeInputElement, {target: {value: testObject.eventTimeInput}})
    fireEvent.change(dateInputElement, {target: {value: '2021/01/01'}})
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(dateInputElement, {target: {value: testObject.eventDateInput.split('-').join('/')}})
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid duration
    fireEvent.change(durationDaysInputElement, {target: {value: testObject.eventDays}})
    fireEvent.change(durationHoursInputElement, {target: {value: '25'}})
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(durationHoursInputElement, {target: {value: testObject.eventHours}})
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid number of accounts
    fireEvent.change(accountsInputElement, {target: {value: '5a'}})
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(accountsInputElement, {target: {value: testObject.maxAccounts}})
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid budget
    fireEvent.change(budgetInputElement, {target: {value: '5a'}})
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(budgetInputElement, {target: {value: testObject.eventBudget}})
    expect(saveButtonElement).toBeEnabled()

    // submit and test redux action call payload
    const saveEventAction = jest.spyOn(actions, "updateEvent").mockImplementation((event) => () => event)
    fireEvent.click(saveButtonElement)
    expect(saveEventAction.mock.lastCall[0]).toMatchObject(testObject)
});
