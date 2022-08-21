import {
    Button,
    Form,
    FormField,
    Header,
    Input,
    Modal,
    SpaceBetween,
    DatePicker,
    TimeInput,
    Grid,
    Box
} from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import moment from "moment";
import { useDispatch, useSelector } from "react-redux";
import { createEvent } from "../../redux/actions/events";
import { isEmpty, regExpAll } from "../components/utils.js";

const CreateEventModal = () => {
    ///////////////
    // INITIALIZE
    ///////////////

    const Config = useSelector((state) => state.config);
    const modal = useSelector((state) => state.modal);
    const [value, setValue] = useState({});
    const [inputError, setInputError] = useState({});
    const dispatch = useDispatch();

    useEffect(() => {
        setInputError({});
        setValue({
            id: "",
            eventName: "",
            eventOwner: "",
            eventDays: Config.EVENT_DEFAULT_LENGTH_DAYS,
            eventHours: Config.EVENT_DEFAULT_LENGTH_HOURS,
            eventBudget: Config.EVENT_DEFAULT_ACCOUNT_BUDGET,
            maxAccounts: Config.EVENT_DEFAULT_ACCOUNTS,
            eventDateInput: "",
            eventTimeInput: ""
        });
    }, [modal, Config]);

    //////////////////
    // FORM HANDLING
    //////////////////

    const validateInputs = (newValue, allowEmptyValues = false) => {
        let errors = {};

        if (
            !(allowEmptyValues && newValue.eventOwner === "") &&
            !new RegExp(regExpAll(Config.EMAIL_REGEX)).test(newValue.eventOwner)
        ) {
            errors.EMAIL = "Invalid email address.";
        }

        if (!(allowEmptyValues && newValue.eventDays === "") && !/^\d+$/.test(newValue.eventDays)) {
            errors.DURATION = "Invalid number of days. Please enter a valid number.";
        } else {
            if (parseInt(newValue.eventDays) > Config.EVENT_MAX_DAYS) {
                errors.DURATION = "Number of days exceeds maximum value of " + Config.EVENT_MAX_DAYS + ".";
            }
        }

        if (!(allowEmptyValues && newValue.eventHours === "") && !/^\d+$/.test(newValue.eventHours)) {
            errors.DURATION = "Invalid number of hours. Please enter a valid number.";
        } else {
            if (parseInt(newValue.eventHours) > 23) {
                errors.DURATION =
                    "Number of hours exceeds maximum value of 23 hrs. Please add another days if you need a longer event duration.";
            }
        }

        if (!(allowEmptyValues && newValue.eventBudget === "") && !/^\d+(\.\d+)*$/.test(newValue.eventBudget)) {
            errors.BUDGET = "Invalid budget. Please enter a valid decimal value.";
        } else {
            if (parseFloat(newValue.eventBudget) > Config.ACCOUNT_MAX_BUDGET) {
                errors.BUDGET = "Budget amount exceeds maximum value of " + Config.ACCOUNT_MAX_BUDGET + ".";
            }
        }

        if (!(allowEmptyValues && newValue.maxAccounts === "") && !/^\d+$/.test(newValue.maxAccounts)) {
            errors.ACCOUNTS = "Invalid number of AWS accounts. Please enter a valid number.";
        } else {
            if (parseInt(newValue.maxAccounts) > Config.EVENT_MAX_ACCOUNTS) {
                errors.ACCOUNTS = "Number of AWS accounts exceeds maximum value of " + Config.EVENT_MAX_ACCOUNTS + ".";
            }
        }

        if (!(allowEmptyValues && newValue.eventDateInput === "" && newValue.eventTimeInput === "")) {
            let eventDate = moment(newValue.eventDateInput + " " + newValue.eventTimeInput, "YYYY/MM/DD hh:mm");
            if (!eventDate.isValid()) {
                errors.DATE = "Unable to parse event date correctly. Please check for invalid date.";
            } else {
                if (eventDate.isSameOrBefore(moment())) {
                    errors.DATE = "Event timestamp has to be in the future.";
                }
            }
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
        newValue.eventOn = moment(newValue.eventDateInput + " " + newValue.eventTimeInput).unix();
        newValue.eventStatus = "Waiting";
        dispatch({ type: "modal/dismiss" });
        dispatch(createEvent(newValue));
    };

    ////////////////////
    // MODAL COMPONENT
    ////////////////////

    return (
        <Modal
            onDismiss={() => dispatch({ type: "modal/dismiss" })}
            visible={modal.status === "createEvent"}
            closeAriaLabel="Close"
            size="large"
            header={<Header variant="h1">Create new event</Header>}
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
                        label="Event name"
                        description="Public: This event name will be visible to event attendees."
                    >
                        <Input
                            type="text"
                            onChange={({ detail }) => updateFormValue({ eventName: detail.value })}
                            value={value.eventName}
                        />
                    </FormField>

                    <FormField label="Event date + time" errorText={inputError.DATE}>
                        <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                            <DatePicker
                                onChange={({ detail }) => updateFormValue({ eventDateInput: detail.value })}
                                value={value.eventDateInput}
                                placeholder="YYYY/MM/DD"
                            />
                            <TimeInput
                                onChange={({ detail }) => updateFormValue({ eventTimeInput: detail.value })}
                                value={value.eventTimeInput}
                                format="hh:mm"
                                placeholder="00:00"
                            />
                        </Grid>
                    </FormField>
                    <FormField label="Event owner email address" errorText={inputError.EMAIL}>
                        <Input
                            type="email"
                            onChange={({ detail }) => updateFormValue({ eventOwner: detail.value })}
                            value={value.eventOwner}
                        />
                    </FormField>
                    <FormField label="Event duration" errorText={inputError.DURATION}>
                        <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
                            <SpaceBetween direction="horizontal" size="xs">
                                <Input
                                    onChange={({ detail }) => updateFormValue({ eventDays: detail.value })}
                                    placeholder="0"
                                    value={value.eventDays}
                                />
                                <Box>days</Box>
                            </SpaceBetween>
                            <SpaceBetween direction="horizontal" size="xs">
                                <Input
                                    onChange={({ detail }) => updateFormValue({ eventHours: detail.value })}
                                    value={value.eventHours}
                                    placeholder="8"
                                />
                                <Box>hours</Box>
                            </SpaceBetween>
                        </Grid>
                    </FormField>
                    <FormField label="Maximum number of AWS accounts" errorText={inputError.ACCOUNTS}>
                        <Input
                            onChange={({ detail }) => updateFormValue({ maxAccounts: detail.value })}
                            value={value.maxAccounts}
                        />
                    </FormField>
                    <FormField
                        label={"Budget in " + Config.BUDGET_CURRENCY}
                        description={
                            "Enter budget cap for each AWS account (maximum " + Config.ACCOUNT_MAX_BUDGET + ")"
                        }
                        errorText={inputError.BUDGET}
                    >
                        <Input
                            onChange={({ detail }) => updateFormValue({ eventBudget: detail.value })}
                            value={value.eventBudget}
                        />
                    </FormField>
                </SpaceBetween>
            </Form>
        </Modal>
    );
};

export default CreateEventModal;
