import { Button, Form, FormField, Header, Input, Modal, Multiselect, SpaceBetween } from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import { regExpAll } from "../components/utils";
import { useDispatch, useSelector } from "react-redux";
import { createUser } from "../../redux/actions/users";
import { isEmpty } from "../components/utils.js";

const CreateUserModal = () => {
    ///////////////
    // INITIALIZE
    ///////////////

    const [value, setValue] = useState({});
    const [inputError, setInputError] = useState({});
    const Config = useSelector((state) => state.config);
    const items = useSelector((state) => state.users.items);
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();

    useEffect(() => {
        setInputError({});
        setValue({
            email: ""
        });
    }, [modal]);

    //////////////////
    // FORM HANDLING
    //////////////////

    const validateInputs = (newValue, allowEmptyValues = false) => {
        let errors = {};

        if (
            !(allowEmptyValues && newValue.email === "") &&
            !new RegExp(regExpAll(Config.EMAIL_REGEX)).test(newValue.email)
        ) {
            errors.EMAIL = "Invalid email address.";
        }
        setInputError(errors);
        return isEmpty(errors);
    };

    const updateFormValue = (update) => {
        setValue((prev) => {
            let newValue = { ...prev, ...update };
            validateInputs(newValue, true);
            return newValue;
        });
    };

    const submit = () => {
        let newValue = value;

        if (!validateInputs(newValue, false)) return;

        if (items.some((item) => item.email === newValue.email)) {
            setInputError((errors) => ({
                ...errors,
                EMAIL: "Found already existing active user for " + newValue.email
            }));
            return;
        }
        dispatch({ type: "modal/dismiss" });
        dispatch(createUser(newValue));
    };

    ////////////////////
    // MODAL COMPONENT
    ////////////////////

    return (
        <Modal
            onDismiss={() => dispatch({ type: "modal/dismiss" })}
            visible={modal.status === "createUser"}
            closeAriaLabel="Close"
            size="large"
            header={<Header variant="h1">Create new user</Header>}
        >
            <Form
                actions={
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="link" onClick={() => dispatch({ type: "modal/dismiss" })}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={() => submit()} disabled={!isEmpty(inputError)}>
                            Create
                        </Button>
                    </SpaceBetween>
                }
            >
                <SpaceBetween direction="vertical" size="l">
                    <FormField
                        label="User email address"
                        errorText={inputError.EMAIL}
                        description="User will receive an automated registration email with one-time password after creation."
                    >
                        <Input
                            type="email"
                            onChange={({ detail }) => updateFormValue({ email: detail.value })}
                            value={value.email}
                        />
                    </FormField>
                    <FormField label="User role">
                        <Multiselect
                            selectedOptions={[
                                ...(value.isOperator ? [{ label: "Operator", value: "isOperator" }] : []),
                                ...(value.isAdmin ? [{ label: "Administrator", value: "isAdmin" }] : [])
                            ]}
                            onChange={({ detail }) =>
                                updateFormValue({
                                    isOperator: detail.selectedOptions.some((item) => item.value === "isOperator"),
                                    isAdmin: detail.selectedOptions.some((item) => item.value === "isAdmin")
                                })
                            }
                            deselectAriaLabel={(e) => `Remove ${e.label}`}
                            options={[
                                {
                                    label: "Operator",
                                    value: "isOperator",
                                    description: "Allows user to manage events"
                                },
                                {
                                    label: "Administrator",
                                    value: "isAdmin",
                                    description: "Allows user to manage AWS accounts and users"
                                }
                            ]}
                            placeholder="Choose roles"
                            selectedAriaLabel="Selected"
                        />
                    </FormField>
                </SpaceBetween>
            </Form>
        </Modal>
    );
};

export default CreateUserModal;
