import { render, screen } from "@testing-library/react";
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
    const budgetInputElement = screen.getByRole("textbox", { name: /budget in usd/i });
    const saveButtonElement = screen.getByRole("button", { name: /save/i })

    // check if submit button is initially enabled
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid email address
    await userEvent.clear(ownerInputElement)
    await await userEvent.type(ownerInputElement, "testowner##")
    expect(saveButtonElement).toBeDisabled()
    await userEvent.clear(ownerInputElement)
    await await userEvent.type(ownerInputElement, testObject.eventOwner)
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid date
    await userEvent.clear(timeInputElement)
    await await userEvent.type(timeInputElement, testObject.eventTimeInput)
    await userEvent.clear(dateInputElement)
    await await userEvent.type(dateInputElement, '2021/01/01')
    expect(saveButtonElement).toBeDisabled()
    await userEvent.clear(dateInputElement)
    await await userEvent.type(dateInputElement, testObject.eventDateInput.split('-').join('/'))
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid duration
    await userEvent.clear(durationDaysInputElement)
    await await userEvent.type(durationDaysInputElement, testObject.eventDays)
    await userEvent.clear(durationHoursInputElement)
    await await userEvent.type(durationHoursInputElement, '25')
    expect(saveButtonElement).toBeDisabled()
    await userEvent.clear(durationHoursInputElement)
    await await userEvent.type(durationHoursInputElement, testObject.eventHours)
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid number of accounts
    await userEvent.clear(accountsInputElement)
    await await userEvent.type(accountsInputElement, '5a')
    expect(saveButtonElement).toBeDisabled()
    await userEvent.clear(accountsInputElement)
    await await userEvent.type(accountsInputElement, testObject.maxAccounts)
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid budget
    await userEvent.clear(budgetInputElement)
    await await userEvent.type(budgetInputElement, '5a')
    expect(saveButtonElement).toBeDisabled()
    await userEvent.clear(budgetInputElement)
    await await userEvent.type(budgetInputElement, testObject.eventBudget)
    expect(saveButtonElement).toBeEnabled()

    // submit and test redux action call payload
    const saveEventAction = jest.spyOn(actions, "updateEvent").mockImplementation((event) => () => event)
    await await userEvent.click(saveButtonElement)
    expect(saveEventAction.mock.lastCall[0]).toMatchObject(testObject)
});
