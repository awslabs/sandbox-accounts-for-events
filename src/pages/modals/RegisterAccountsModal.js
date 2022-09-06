import {
    Box,
    Button,
    ExpandableSection,
    Form,
    FormField,
    Header,
    Input,
    Modal,
    SpaceBetween,
    Textarea
} from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { registerAccounts } from "../../redux/actions/accounts";
import { isEmpty } from "../components/utils.js";
import CopyClipboardIconButton from "../components/CopyClipboardIconButton";

const RegisterAccountsModal = () => {
    ///////////////
    // INITIALIZE
    ///////////////

    const [value, setValue] = useState({});
    const [inputError, setInputError] = useState({});
    const accounts = useSelector((state) => state.accounts);
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();

    useEffect(() => {
        setInputError({});
        setValue({
            accountIds: "",
            roleName: ""
        });
    }, [modal]);

    //////////////////
    // FORM HANDLING
    //////////////////

    const validateInputs = (newValue, allowEmptyValues = false) => {
        let errors = {};

        if (
            !(allowEmptyValues && newValue.accountIds.length === 0) &&
            !/^[,;\s]*["']?\d{12}["']?([,;\s]+["']?\d{12}["']?)*[,;\s]*$/.test(newValue.accountIds)
        ) {
            errors.ACCOUNTS = "Invalid account ID list.";
        }

        if ((newValue.roleName.length !== 0) && !/^[\w+=,.@-]{1,64}$/.test(newValue.roleName)) {
            errors.ROLE = "Invalid role name.";
        }

        if (!allowEmptyValues && newValue.roleName.length === 0) {
            errors.ROLE = "Role name may not be empty.";
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
        let accountIds = value.accountIds.match(/\d{12}/g);

        let duplicateAccounts = accountIds.filter((idValue, idx, list) => list.indexOf(idValue) !== idx);
        if (duplicateAccounts.length > 0) {
            setInputError((errors) => ({
                ...errors,
                ACCOUNTS:
                    "Found duplicate AWS account ID" +
                    (duplicateAccounts.length > 1 ? "s" : "") +
                    " in list: " +
                    duplicateAccounts.join(", ")
            }));
            return;
        }

        let existingAccounts = accounts.items
            .filter((item) => accountIds.indexOf(item.id) !== -1)
            .map((item) => item.id);
        if (existingAccounts.length > 0) {
            setInputError((errors) => ({
                ...errors,
                ACCOUNTS:
                    "Found AWS account" +
                    (existingAccounts.length > 1 ? "s" : "") +
                    " already registered: " +
                    existingAccounts.join(", ")
            }));
            return;
        }

        dispatch({ type: "modal/dismiss" });
        dispatch(
            registerAccounts({
                accountIds,
                roleName: newValue.roleName
            })
        );
    };

    ////////////////////
    // MODAL COMPONENT
    ////////////////////

    return (
        <Modal
            onDismiss={() => dispatch({ type: "modal/dismiss" })}
            visible={modal.status === "registerAccount"}
            closeAriaLabel="Close"
            size="large"
            header={
                <Header
                    variant="h1"
                    description="You can register a single AWS account or bulk register multiple AWS accounts."
                >
                    Register AWS accounts
                </Header>
            }
        >
            <Form
                actions={
                    <SpaceBetween direction="horizontal" size="xs">
                        <Button variant="link" onClick={() => dispatch({ type: "modal/dismiss" })}>
                            Cancel
                        </Button>
                        <Button variant="primary" onClick={() => submit()} disabled={!isEmpty(inputError)}>
                            Register account(s)
                        </Button>
                    </SpaceBetween>
                }
            >
                <SpaceBetween direction="vertical" size="l">
                    <FormField
                        label="List of AWS account IDs to be registered"
                        description="Separate AWS account IDs by comma, space or new line per account"
                        errorText={inputError.ACCOUNTS}
                    >
                        <Textarea
                            onChange={({ detail }) => updateFormValue({ accountIds: detail.value })}
                            value={value.accountIds}
                            placeholder="112233445566,223344556677"
                        />
                    </FormField>
                    <FormField
                        label="Admin role for backend account management tasks in children accounts."
                        description="Enter only role name, not the role ARN. Role must have policy AdministratorAccess attached."
                        errorText={inputError.ROLE}
                    >
                        <Input
                            onChange={({ detail }) => updateFormValue({ roleName: detail.value })}
                            value={value.roleName}
                            placeholder="enter IAM role, e.g. 'DCEAdmin'"
                        />
                    </FormField>
                    <ExpandableSection
                        header={
                            <Header variant="h6">
                                <SpaceBetween direction="horizontal" size="s">
                                    <Box>Required IAM trust relationship policy for backend admin role</Box>
                                    <CopyClipboardIconButton content={accounts.rolePolicy}>
                                        &nbsp;
                                    </CopyClipboardIconButton>
                                </SpaceBetween>
                            </Header>
                        }
                    >
                        <pre>{accounts.rolePolicy}</pre>
                    </ExpandableSection>
                </SpaceBetween>
            </Form>
        </Modal>
    );
};

export default RegisterAccountsModal;
