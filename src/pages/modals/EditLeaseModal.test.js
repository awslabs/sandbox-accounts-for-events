import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditLeaseModal from "./EditLeaseModal";
import { Provider } from "react-redux";
import store from "../../redux/store";
import * as actions from "../../redux/actions/leases";
import moment from "moment";

const ReduxProvider = ({ children, reduxStore }) => <Provider store={reduxStore}>{children}</Provider>;

test("renders EditLeaseModal, enters valid and invalid texts, submits", async () => {

    const testObject = {
        leaseStatusReason: "Active",
        user: 'testuser@domain.org',
        eventId: 'a1b2c3d4e5',
        budgetAmount: '10',
        expiresDateInput: '2099-01-01',
        expiresTimeInput: '10:00',
    }
    testObject.budgetNotificationEmails = [testObject.user]
    testObject.expiresOn = moment(testObject.expiresDateInput + " " + testObject.expiresTimeInput).unix()
    store.dispatch({ type: "modal/open", item: testObject })
    render(
        <ReduxProvider reduxStore={store}>
            <EditLeaseModal isAdminView/>
        </ReduxProvider>
    );
    expect(screen.getByText(/edit lease for/i)).toBeInTheDocument();
    const dateInputElement = screen.getByPlaceholderText("YYYY/MM/DD");
    const timeInputElement = screen.getByPlaceholderText("00:00");
    const budgetInputElement = screen.getByLabelText(/budget in usd/i);
    const saveButtonElement = screen.getByRole("button", { name: "Save" })

    // check if submit button is initially enabled
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid budget
    fireEvent.change(budgetInputElement, { target: { value: "" }})
    userEvent.type(budgetInputElement, '5a')
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(budgetInputElement, { target: { value: "" }})
    userEvent.type(budgetInputElement, testObject.budgetAmount)
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid date
    fireEvent.change(timeInputElement, { target: { value: "" }})
    userEvent.type(timeInputElement, testObject.expiresTimeInput)
    fireEvent.change(dateInputElement, { target: { value: "" }})
    userEvent.type(dateInputElement, '2021/01/01')
    expect(saveButtonElement).toBeDisabled()
    fireEvent.change(dateInputElement, { target: { value: "" }})
    userEvent.type(dateInputElement, testObject.expiresDateInput.split('-').join('/'))
    expect(saveButtonElement).toBeEnabled()

    // submit and test redux action call payload
    const saveLeaseAction = jest.spyOn(actions, "updateLease").mockImplementation((lease) => () => lease)
    userEvent.click(saveButtonElement)

    // identify components of confirmation dialog
    expect(screen.getByText(/please confirm/i)).toBeInTheDocument();
    const confirmTextInputElement = screen.getByPlaceholderText("update");
    const confirmButtonElement = screen.getByRole("button", { name: "Update" })

    // check if submit button is initially disabled
    expect(confirmButtonElement).toBeDisabled()

    // input confirmation text & submit
    userEvent.type(confirmTextInputElement, "update")
    expect(confirmButtonElement).toBeEnabled()
    userEvent.click(confirmButtonElement)
    expect(saveLeaseAction.mock.lastCall[0]).toMatchObject(testObject)
});
