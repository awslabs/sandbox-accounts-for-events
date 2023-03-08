import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateUserModal from "./CreateUserModal";
import { Provider } from "react-redux";
import store from "../../redux/store";
import * as actions from "../../redux/actions/users";

const ReduxProvider = ({ children, reduxStore }) => <Provider store={reduxStore}>{children}</Provider>;

test("renders CreateUserModal, cannot submit empty dialog", async () => {

    render(
        <ReduxProvider reduxStore={store}>
            <CreateUserModal />
        </ReduxProvider>
    );
    const createButtonElement = screen.getByRole("button", { name: "Create" })

    expect(screen.getByText(/create new user/i)).toBeInTheDocument();

    expect(createButtonElement).toBeEnabled()
    await userEvent.click(createButtonElement)
    expect(createButtonElement).toBeDisabled()
});

test("renders CreateUserModal, enters valid and invalid texts, submits", async () => {

    const testObject = {
        email: 'testuser@domain.org'
    }
    render(
        <ReduxProvider reduxStore={store}>
            <CreateUserModal/>
        </ReduxProvider>
    );
    expect(screen.getByText(/create new user/i)).toBeInTheDocument();
    const userInputElement = screen.getByLabelText(/user email address/i);
    const createButtonElement = screen.getByRole("button", { name: "Create" })

    // check if submit button is initially enabled
    expect(createButtonElement).toBeEnabled()

    // try invalid and valid email address
    await userEvent.type(userInputElement, "testuser")
    expect(createButtonElement).toBeDisabled()
    await userEvent.clear(userInputElement)
    await userEvent.type(userInputElement, testObject.email)
    expect(createButtonElement).toBeEnabled()

    // submit and test redux action call payload
    const createUserAction = jest.spyOn(actions, "createUser").mockImplementation((user) => () => user)
    await userEvent.click(createButtonElement)
    expect(createUserAction.mock.lastCall[0]).toMatchObject(testObject)
});
