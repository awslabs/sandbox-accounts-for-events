import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    fireEvent.change(ownerInputElement, { target: { value: "" }})
    userEvent.type(ownerInputElement, "testowner")
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(ownerInputElement, { target: { value: "" }})
    userEvent.type(ownerInputElement, testObject.eventOwner)
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid date
    fireEvent.change(timeInputElement, { target: { value: "" }})
    userEvent.type(timeInputElement, testObject.eventTimeInput)
    fireEvent.change(dateInputElement, { target: { value: "" }})
    userEvent.type(dateInputElement, '2021/01/01')
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(dateInputElement, { target: { value: "" }})
    userEvent.type(dateInputElement, testObject.eventDateInput.split('-').join('/'))
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid duration
    fireEvent.change(durationDaysInputElement, { target: { value: "" }})
    userEvent.type(durationDaysInputElement, testObject.eventDays)
    fireEvent.change(durationHoursInputElement, { target: { value: "" }})
    userEvent.type(durationHoursInputElement, '25')
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(durationHoursInputElement, { target: { value: "" }})
    userEvent.type(durationHoursInputElement, testObject.eventHours)
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid number of accounts
    fireEvent.change(accountsInputElement, { target: { value: "" }})
    userEvent.type(accountsInputElement, '5a')
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(accountsInputElement, { target: { value: "" }})
    userEvent.type(accountsInputElement, testObject.maxAccounts)
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid budget
    fireEvent.change(budgetInputElement, { target: { value: "" }})
    userEvent.type(budgetInputElement, '5a')
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(budgetInputElement, { target: { value: "" }})
    userEvent.type(budgetInputElement, testObject.eventBudget)
    expect(saveButtonElement).toBeEnabled()

    // submit and test redux action call payload
    const saveEventAction = jest.spyOn(actions, "updateEvent").mockImplementation((event) => () => event)
    userEvent.click(saveButtonElement)
    expect(saveEventAction.mock.lastCall[0]).toMatchObject(testObject)
});
