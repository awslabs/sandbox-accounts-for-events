import { Button, Form, FormField, Header, Input, Modal, Multiselect, SpaceBetween } from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { updateUser } from "../../redux/actions/users";

const EditUserModal = () => {
    ///////////////
    // INITIALIZE
    ///////////////

    const [value, setValue] = useState({});
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();

    const closeModal = () => {
        dispatch({ type: "modal/dismiss" });
    };

    useEffect(() => {
        setValue(modal.item);
    }, [modal.item]);

    //////////////////
    // FORM HANDLING
    //////////////////

    const updateFormValue = (update) => {
        setValue((prev) => {
            return { ...prev, ...update };
        });
    };

    const submit = () => {
        let newValue = value;
        closeModal();
        dispatch(updateUser(newValue));
    };

    ////////////////////
    // MODAL COMPONENT
    ////////////////////

    return (
        <>
            <Modal
                onDismiss={closeModal}
                visible={modal.status === "editUser"}
                closeAriaLabel="Close"
                size="large"
                header={<Header variant="h1">Edit user {value.email}</Header>}
            >
                <Form
                    actions={
                        <SpaceBetween direction="horizontal" size="xs">
                            <Button variant="link" onClick={closeModal}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={submit}>
                                Save
                            </Button>
                        </SpaceBetween>
                    }
                >
                    <SpaceBetween direction="vertical" size="l">
                        <FormField label="Email address" description="not editable">
                            <Input value={value.email} disabled />
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
                                        description: "Allows user to manange AWS accounts and users"
                                    }
                                ]}
                                placeholder="Choose roles"
                                selectedAriaLabel="Selected"
                            />
                        </FormField>
                        <FormField label="Created on" description="not editable">
                            <Input value={value.createdDate} disabled />
                        </FormField>
                        <FormField label="Last modified on" description="not editable">
                            <Input value={value.lastModifiedDate} disabled />
                        </FormField>
                    </SpaceBetween>
                </Form>
            </Modal>
        </>
    );
};

export default EditUserModal;
