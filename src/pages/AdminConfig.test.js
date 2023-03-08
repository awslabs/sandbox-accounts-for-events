import { render, screen } from "@testing-library/react";
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

    for (const item of Object.keys(config)) {
        if (typeof config[item] === "number") {
            const parameterElement = screen.queryByTestId(item)
            if (parameterElement !== null) {
                const inputElement = parameterElement.childNodes[0]
                await userEvent.clear(inputElement)
                await userEvent.type(inputElement, 'a1b2')
                expect(saveButtonElement).toBeDisabled()

                await userEvent.clear(inputElement)
                await userEvent.type(inputElement, "10")
                expect(saveButtonElement).toBeEnabled()
            }
        }
    };

    // undo inputs
    await userEvent.click(undoButtonElement)
    const confirmUndoButton = screen.getByTestId("confirmUndo inputsDialog")
    await userEvent.click(confirmUndoButton)

    // submit and test redux action call payload
    const saveConfigAction = jest.spyOn(actions, "updateConfig").mockImplementation((updateConfig) => () => updateConfig)
    await userEvent.click(saveButtonElement)

    // identify components of confirmation dialog
    const confirmTextInputElement = screen.getByPlaceholderText("save");
    const confirmButtonElement = screen.getByRole("button", { name: "Save" })

    // check if submit button is initially disabled
    expect(confirmButtonElement).toBeDisabled()

    // input confirmation text & submit
    await userEvent.type(confirmTextInputElement, "save")
    expect(confirmButtonElement).toBeEnabled()
    await userEvent.click(confirmButtonElement)
    expect(saveConfigAction.mock.lastCall[0]).toMatchObject(config)
});
