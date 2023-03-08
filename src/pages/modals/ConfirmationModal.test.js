import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmationModal from "./ConfirmationModal";
import { Provider } from "react-redux";
import store from "../../redux/store";

const ReduxProvider = ({ children, reduxStore }) => <Provider store={reduxStore}>{children}</Provider>;

test("renders simple ConfirmationModal with button text, action and content", async () => {
    const contentText = "ContentText"
    const buttonText = "ButtonText"
    const buttonCallback = jest.fn()
    render(
        <ReduxProvider reduxStore={store}>
            <ConfirmationModal 
                visible={true}
                action={buttonCallback}
                buttonText={buttonText}
            >
                {contentText}
            </ConfirmationModal>
        </ReduxProvider>
    );
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByText(contentText)).toBeInTheDocument();
    const actionButton = screen.getByRole("button", { name: buttonText })
    await userEvent.click(actionButton)
    expect(buttonCallback).toHaveBeenCalled()
});

test("renders extended ConfirmationModal, enters confirmationText and submits", async () => {
    const contentText = "ContentText"
    const buttonText = "ButtonText"
    const confirmationText = "confirmationText"
    const buttonCallback = jest.fn()
    render(
        <ReduxProvider reduxStore={store}>
            <ConfirmationModal 
                visible={true}
                action={buttonCallback}
                buttonText={buttonText}
                confirmationText={confirmationText}
            >
                {contentText}
            </ConfirmationModal>
        </ReduxProvider>
    );
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
    expect(screen.getByText(contentText)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(confirmationText)).toBeInTheDocument();

    const confirmButtonElement = screen.getByRole("button", { name: buttonText })
    const confirmationInputElement = screen.getByRole("textbox")

    expect(confirmButtonElement).toBeDisabled()
    await userEvent.type(confirmationInputElement, confirmationText)
    expect(confirmButtonElement).toBeEnabled()
    await userEvent.click(confirmButtonElement)
    expect(buttonCallback).toHaveBeenCalled()
});
