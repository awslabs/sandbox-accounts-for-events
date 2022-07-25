import { Button, Form, FormField, Header, Input, Modal, Select, SpaceBetween } from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import ConfirmationModal from "../modals/ConfirmationModal";
import { useDispatch, useSelector } from "react-redux";
import { updateAccount } from "../../redux/actions/accounts";
import { isEmpty } from "../components/utils.js";

const EditAccountModal = () => {
    const [value, setValue] = useState({});
    const [inputError, setInputError] = useState({});
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();

    useEffect(() => {
        setInputError({});
        setValue(modal.item);
    }, [modal.item]);

    //////////////////
    // FORM HANDLING
    //////////////////

    const validateInputs = (newValue) => {
        let errors = {};

        if (!/^arn:aws:iam::\d{12}:role\/[\w+=,.@-]{1,64}$/.test(newValue.adminRoleArn)) {
            errors.ROLE_ARN = "Invalid role ARN.";
        }

        setInputError(errors);
        return isEmpty(errors);
    };

    const updateFormValue = (update) => {
        setValue((prev) => {
            let newValue = { ...prev, ...update };
            validateInputs(newValue);
            return newValue;
        });
    };

    const submit = () => {
        if (!validateInputs(value)) {
            return;
        }
        dispatch({ type: "modal/dismiss" });
        dispatch(updateAccount(value));
    };

    ////////////////////
    // MODAL COMPONENT
    ////////////////////

    return (
        <>
            <Modal
                onDismiss={() => dispatch({ type: "modal/dismiss" })}
                visible={modal.status === "editAccount"}
                closeAriaLabel="Close"
                size="large"
                header={<Header variant="h1">Edit AWS account {value.id}</Header>}
            >
                <Form
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="link" onClick={() => dispatch({ type: "modal/dismiss" })}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={() => dispatch({ type: "modal/confirm" })}
                                disabled={!isEmpty(inputError)}
                            >
                                Save
                            </Button>
                        </SpaceBetween>
                    }
                >
                    <SpaceBetween direction="vertical" size="l">
                        <FormField
                            label="Account status"
                            description="This is a manual status override - use at your own risk"
                        >
                            <Select
                                onChange={({ detail }) =>
                                    updateFormValue({ accountStatus: detail.selectedOption.value })
                                }
                                selectedAriaLabel="Selected"
                                selectedOption={{ label: value.accountStatus, value: value.accountStatus }}
                                options={[
                                    { label: "Ready", value: "Ready" },
                                    { label: "NotReady", value: "NotReady" },
                                    { label: "Leased", value: "Leased" }
                                ]}
                            />
                        </FormField>
                        <FormField
                            label="Admin role for backend account management tasks"
                            errorText={inputError.ROLE_ARN}
                            description="This role needs to have a trust relationship to the master account"
                        >
                            <Input
                                onChange={({ detail }) => updateFormValue({ adminRoleArn: detail.value })}
                                value={value.adminRoleArn}
                            />
                        </FormField>
                        <FormField label="Role for lease principal" description="not editable">
                            <Input value={value.principalRoleArn} disabled />
                        </FormField>
                        <FormField label="Created on">
                            <Input value={value.createdDate} disabled />
                        </FormField>
                        <FormField label="Last modified on">
                            <Input value={value.lastModifiedDate} disabled />
                        </FormField>
                    </SpaceBetween>
                </Form>
            </Modal>
            <ConfirmationModal
                visible={modal.confirm}
                action={submit}
                confirmationText="update"
                buttonText="Update"
                alert="warning"
            >
                Do you really want to update AWS account {value.id} with the new values? By confirming you will manually
                override values in the internal backend database, which might cause inconsistent or undesired behaviour.
                Make sure you are really doing the right thing here!
                <br />
                <strong>Use at your own risk and in exception cases only.</strong>
            </ConfirmationModal>
        </>
    );
};

export default EditAccountModal;
