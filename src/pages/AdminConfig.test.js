import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AdminConfig from "./AdminConfig";
import { Provider } from "react-redux";
import store from "../redux/store";
import * as actions from "../redux/actions/config";

const ReduxProvider = ({ children, reduxStore }) => <Provider store={reduxStore}>{children}</Provider>;

test("renders AdminConfig, enters valid and invalid texts, submits", async () => {

    const config = store.getState().config
    const fetchConfigAction = jest.spyOn(actions, "fetchConfig").mockImplementation((fetchConfig) => () => fetchConfig)

    render(
        <ReduxProvider reduxStore={store}>
            <AdminConfig/>
        </ReduxProvider>
    );

    expect(fetchConfigAction).toBeCalled()

    const saveButtonElement = screen.getByTestId("saveConfigButton")
    const undoButtonElement = screen.getByTestId("undoConfigButton")
    const loadButtonElement = screen.getByTestId("loadDefaultConfigButton")

    // check if all buttons are initially enabled
    expect(saveButtonElement).toBeEnabled()
    expect(undoButtonElement).toBeEnabled()
    expect(loadButtonElement).toBeEnabled()

    // check if sections are present
    expect(screen.getByText(/lease and event parameters/i)).toBeInTheDocument();
    expect(screen.getByText(/display preferences/i)).toBeInTheDocument();

    // try numeric and alphanumeric values for number all numer fields
    Object.keys(config).forEach((item) => {
        if (typeof config[item] === "number") {
            const parameterElement = screen.queryByTestId(item)
            if (parameterElement !== null) {
                const inputElement = parameterElement.childNodes[0]
                fireEvent.change(inputElement, { target: { value: "" }})
                userEvent.type(inputElement, '1a2b')
                expect(saveButtonElement).toBeDisabled()

                // check if default > max fails
                if (["EVENT_DEFAULT_LENGTH_DAYS","EVENT_DEFAULT_ACCOUNTS","EVENT_DEFAULT_ACCOUNT_BUDGET"].includes(item)) {
                    fireEvent.change(inputElement, { target: { value: "" }})
                    userEvent.type(inputElement, '20')
                    expect(saveButtonElement).toBeDisabled()
                }

                fireEvent.change(inputElement, { target: { value: "" }})
                userEvent.type(inputElement, "10")
                expect(saveButtonElement).toBeEnabled()
            }
        }
    });

    // undo inputs
    userEvent.click(undoButtonElement)
    const confirmUndoButton = screen.getByTestId("confirmUndo inputsDialog")
    userEvent.click(confirmUndoButton)

    // submit and test redux action call payload
    const saveConfigAction = jest.spyOn(actions, "updateConfig").mockImplementation((updateConfig) => () => updateConfig)
    userEvent.click(saveButtonElement)

    // identify components of confirmation dialog
    const confirmTextInputElement = screen.getByPlaceholderText("save");
    const confirmButtonElement = screen.getByRole("button", { name: "Save" })

    // check if submit button is initially disabled
    expect(confirmButtonElement).toBeDisabled()

    // input confirmation text & submit
    userEvent.type(confirmTextInputElement, "save")
    expect(confirmButtonElement).toBeEnabled()
    userEvent.click(confirmButtonElement)
    expect(saveConfigAction.mock.lastCall[0]).toMatchObject(config)
});
