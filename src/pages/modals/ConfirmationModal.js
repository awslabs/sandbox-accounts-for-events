import { Button, Form, FormField, Input, Modal, SpaceBetween, Alert, Header } from "@cloudscape-design/components";
import React, { useState } from "react";
import { useDispatch } from "react-redux";

const ConfirmationModal = ({ visible, action, buttonText, confirmationText, children, alert, header }) => {
    const EMPTY_INPUT_VALUE = "";
    const [value, setValue] = useState(EMPTY_INPUT_VALUE);
    const dispatch = useDispatch();

    const closeModal = () => {
        setValue(EMPTY_INPUT_VALUE);
        dispatch({ type: "modal/dismiss" });
    };

    return (
        <Modal onDismiss={closeModal} visible={visible} closeAriaLabel="Close" size="medium" header="Please confirm">
            <Form
                actions={
                    <SpaceBetween direction="horizontal" size="m">
                        <Button variant="link" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            disabled={confirmationText ? confirmationText !== value : false}
                            onClick={() => {
                                action();
                                closeModal();
                            }}
                            data-testid={"confirm" + buttonText + "Dialog"}
                        >
                            {buttonText}
                        </Button>
                    </SpaceBetween>
                }
            >
                <SpaceBetween size="l">
                    <Alert type={alert} header={header ?? <Header>Are you sure?</Header>}>
                        {children}
                    </Alert>
                    {confirmationText ? (
                        <FormField description={'Enter "' + confirmationText + '" to confirm.'}>
                            <Input
                                value={value}
                                placeholder={confirmationText}
                                onChange={(event) => setValue(event.detail.value)}
                            />
                        </FormField>
                    ) : null}
                </SpaceBetween>
            </Form>
        </Modal>
    );
};

export default ConfirmationModal;
