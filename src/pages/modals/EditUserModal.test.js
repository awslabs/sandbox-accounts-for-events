import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditUserModal from "./EditUserModal";
import { Provider } from "react-redux";
import store from "../../redux/store";
import * as actions from "../../redux/actions/users";

const ReduxProvider = ({ children, reduxStore }) => <Provider store={reduxStore}>{children}</Provider>;

test("renders EditUserModal, submits", async () => {

    const testObject = {
        email: 'testemail@domain.org',
    }
    store.dispatch({ type: "modal/open", item: testObject })
    render(
        <ReduxProvider reduxStore={store}>
            <EditUserModal />
        </ReduxProvider>
    );

    expect(screen.getByText(/edit user/i)).toBeInTheDocument();
    const saveButtonElement = screen.getByRole("button", { name: "Save" })

    // check if submit button is initially enabled
    expect(saveButtonElement).toBeEnabled()

    // submit and test redux action call payload
    const saveUserAction = jest.spyOn(actions, "updateUser").mockImplementation((event) => () => event)
    await userEvent.click(saveButtonElement)
    expect(saveUserAction.mock.lastCall[0]).toMatchObject(testObject)
});
