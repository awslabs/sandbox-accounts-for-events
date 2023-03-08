import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditAccountModal from "./EditAccountModal";
import { Provider } from "react-redux";
import store from "../../redux/store";
import * as actions from "../../redux/actions/accounts";

const ReduxProvider = ({ children, reduxStore }) => <Provider store={reduxStore}>{children}</Provider>;

test("renders EditAccountModal, enters valid and invalid texts, submits", async () => {

    const testObject = {
        adminRole: "arn:aws:iam::112233445566:role/OrganizationAccountAccessRole",
        accountStatus: "Leased"
    }
    store.dispatch({ type: "modal/open", item: testObject })
    render(
        <ReduxProvider reduxStore={store}>
            <EditAccountModal isAdminView/>
        </ReduxProvider>
    );
    expect(screen.getByText(/edit aws account/i)).toBeInTheDocument();
    const roleInputElement = screen.getByLabelText(/admin role for backend account management tasks/i);
    const saveButtonElement = screen.getByRole("button", { name: "Save" })

    // check if submit button is initially enabled
    expect(saveButtonElement).toBeEnabled()

    // try invalid and valid budget
    await userEvent.clear(roleInputElement)
    await userEvent.type(roleInputElement, 'invalid?role#name')
    expect(saveButtonElement).toBeDisabled()
    await userEvent.clear(roleInputElement)
    await userEvent.type(roleInputElement, testObject.adminRole)
    expect(saveButtonElement).toBeEnabled()

    // submit and test redux action call payload
    const saveAccountAction = jest.spyOn(actions, "updateAccount").mockImplementation((account) => () => account)
    await userEvent.click(saveButtonElement)

    // identify components of confirmation dialog
    expect(screen.getByText(/please confirm/i)).toBeInTheDocument();
    const confirmTextInputElement = screen.getByPlaceholderText("update");
    const confirmButtonElement = screen.getByRole("button", { name: "Update" })

    // check if submit button is initially disabled
    expect(confirmButtonElement).toBeDisabled()

    // input confirmation text & submit
    await userEvent.type(confirmTextInputElement, "update")
    expect(confirmButtonElement).toBeEnabled()
    await userEvent.click(confirmButtonElement)
    expect(saveAccountAction.mock.lastCall[0]).toMatchObject(testObject)
});
