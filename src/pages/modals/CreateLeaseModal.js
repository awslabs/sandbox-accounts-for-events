import { Button, Form, FormField, Header, Input, Modal, SpaceBetween, Grid, Box } from "@cloudscape-design/components";
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import moment from "moment";
import { createLease } from "../../redux/actions/leases";
import { isEmpty, regExpAll } from "../components/utils.js";

const CreateLeaseModal = ({ isAdminView }) => {
    ///////////////
    // INITIALIZE
    ///////////////

    const modal = useSelector((state) => state.modal);
    const [value, setValue] = useState({});
    const [inputError, setInputError] = useState({});
    const items = useSelector((state) => state.leases.items);
    const Config = useSelector((state) => state.config);
    const dispatch = useDispatch();

    useEffect(() => {
        setValue({
            user: "",
            eventId: modal.item.id !== undefined ? modal.item.id : "",
            budgetAmount: modal.item.eventBudget !== undefined ? modal.item.eventBudget : "",
            budgetNotificationEmails: [""],
            expiryDays: modal.item.eventDays !== undefined ? modal.item.eventDays : "",
            expiryHours: modal.item.eventHours !== undefined ? modal.item.eventHours : ""
        });
    }, [modal]);

    //////////////////
    // FORM HANDLING
    //////////////////

    const validateInputs = (newValue, allowEmptyValues = false) => {
        let errors = {};

        if (
            !(allowEmptyValues && newValue.user === "") &&
            !new RegExp(regExpAll(Config.EMAIL_REGEX)).test(newValue.user)
        ) {
            errors.EMAIL = "Invalid email address.";
        }

        if ((newValue.eventId !== "") && !new RegExp(regExpAll(Config.EVENT_ID_REGEX)).test(newValue.eventId)) {
            errors.EVENT_ID = "Invalid event ID.";
        }

        if (!(allowEmptyValues && newValue.budgetAmount === "") && !/^\d+(\.\d+)*$/.test(newValue.budgetAmount)) {
            errors.BUDGET = "Invalid budget. Please enter a valid decimal value.";
        } else {
            if (parseFloat(newValue.budgetAmount) > Config.ACCOUNT_MAX_BUDGET) {
                errors.BUDGET = "Budget amount exceeds maximum value of " + Config.ACCOUNT_MAX_BUDGET + ".";
            }
        }

        if (!(allowEmptyValues && newValue.expiryDays === "") && !/^\d+$/.test(newValue.expiryDays)) {
            errors.DURATION = "Invalid number of days. Please enter a valid number.";
        } else {
            if (parseInt(newValue.expiryDays) > Config.EVENT_MAX_DAYS) {
                errors.DURATION = "Number of days exceeds maximum value of " + Config.EVENT_MAX_DAYS + ".";
            }
        }

        if (!(allowEmptyValues && newValue.expiryHours === "") && !/^\d+$/.test(newValue.expiryHours)) {
            errors.DURATION = "Invalid number of hours. Please enter a valid number.";
        } else {
            if (parseInt(newValue.expiryHours) > 23) {
                errors.DURATION =
                    "Number of hours exceeds maximum value of 23 hrs. Please add another days if you need a longer event duration.";
            }
        }

        setInputError(errors);
        return isEmpty(errors);
    };

    const updateFormValue = (update) => {
        setValue((prev) => {
            let newValue = { ...prev, ...update };
            validateInputs(newValue, true);
            let user = newValue.user.replace(/[^a-zA-Z0-9]/g, Config.EVENT_EMAIL_SUBST);

            if (newValue.eventId !== "")
                newValue.principalId = newValue.eventId + Config.EVENT_PRINCIPAL_SEPARATOR + user;
            else newValue.principalId = user;

            return newValue;
        });
    };

    const submit = () => {
        let newValue = value;

        if (!validateInputs(newValue, false)) return;

        if (items && items.some((item) => item.principalId === newValue.principalId)) {
            setInputError((errors) => ({
                ...errors,
                EMAIL:
                    "Found existing lease for user " +
                    newValue.user +
                    (modal.item.eventOn ? " for this event" : "") +
                    ". Please terminate/delete the existing lease first to be able to create a new lease."
            }));
            return;
        }

        newValue.expiresOn = moment().add(newValue.expiryDays, "days").add(newValue.expiryHours, "hours").unix();
        newValue.budgetNotificationEmails[0] = newValue.user;

        dispatch({ type: "modal/dismiss" });
        dispatch(createLease(newValue));
    };

    ////////////////////
    // MODAL COMPONENT
    ////////////////////

    return (
        <Modal
            onDismiss={() => dispatch({ type: "modal/dismiss" })}
            visible={modal.status === "createLease"}
            closeAriaLabel="Close"
            size="large"
            header={<Header variant="h1">Create new lease</Header>}
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
                        description="User has to log in with this email address to get access to the leased AWS account."
                    >
                        <Input
                            type="email"
                            onChange={({ detail }) => updateFormValue({ user: detail.value })}
                            value={value.user}
                        />
                    </FormField>
                    <FormField
                        label={"Budget in " + Config.BUDGET_CURRENCY}
                        description={"Enter budget cap for this lease (maximum " + Config.ACCOUNT_MAX_BUDGET + ")"}
                        errorText={inputError.BUDGET}
                    >
                        <Input
                            onChange={({ detail }) => updateFormValue({ budgetAmount: detail.value })}
                            value={value.budgetAmount}
                            placeholder="10"
                        />
                    </FormField>
                    <FormField label="Lease expiration in" errorText={inputError.DURATION}>
                        <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                            <SpaceBetween direction="horizontal" size="xs">
                                <Input
                                    onChange={({ detail }) => updateFormValue({ expiryDays: detail.value })}
                                    value={value.expiryDays}
                                    placeholder="0"
                                    />
                                <Box>days</Box>
                            </SpaceBetween>
                            <SpaceBetween direction="horizontal" size="xs">
                                <Input
                                    onChange={({ detail }) => updateFormValue({ expiryHours: detail.value })}
                                    value={value.expiryHours}
                                    placeholder="8"
                                    />
                                <Box>hours</Box>
                            </SpaceBetween>
                        </Grid>
                    </FormField>
                    {isAdminView ? (
                        <FormField
                            label="Event ID"
                            errorText={inputError.EVENT_ID}
                            description="Leave empty if you do not want to associate this lease to an event."
                        >
                            <Input
                                onChange={({ detail }) => updateFormValue({ eventId: detail.value })}
                                value={value.eventId}
                            />
                        </FormField>
                    ) : null}
                </SpaceBetween>
            </Form>
        </Modal>
    );
};

export default CreateLeaseModal;
