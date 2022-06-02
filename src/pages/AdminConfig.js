import {
    AppLayout,
    Box,
    BreadcrumbGroup,
    Container,
    ColumnLayout,
    Form,
    FormField,
    Input,
    Button,
    Header,
    HelpPanel,
    SpaceBetween
} from "@awsui/components-react";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Navigation from "./components/Navigation";
import { fetchConfig, updateConfig } from "../redux/actions/config";
import ConfirmationModal from "./modals/ConfirmationModal";
import NotificationFlashbar from "./components/NotificationFlashbar";
import { isEmpty } from "./components/utils.js";

const AdminConfig = () => {
    ///////////////
    // INITIALIZE
    ///////////////

    const Config = useSelector((state) => state.config);
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();

    const [value, setValue] = useState({});
    const [inputError, setInputError] = useState({});

    ////////////
    // ACTIONS
    ////////////

    useEffect(() => {
        dispatch(fetchConfig());
    }, [dispatch]);

    useEffect(() => {
        setInputError({});
        setValue(Config);
    }, [Config]);

    useEffect(() => {
        dispatch({ type: "notification/dismiss" });
        dispatch({ type: "selection/dismiss" });
        dispatch({ type: "modal/dismiss" });
    }, [dispatch]);

    //////////////////
    // FORM HANDLING
    //////////////////

    const validateInputs = (newValue) => {
        let errors = {};
        setInputError({});
        Object.keys(newValue).forEach((item) => {
            if (typeof Config[item] === "number") {
                if (isNaN(newValue[item]) || Number(newValue[item]) < 0 || Number(newValue[item]) === Infinity) {
                    errors[item] = "Please enter a valid positive number.";
                } else {
                    if (
                        (item === "EVENT_DEFAULT_ACCOUNT_BUDGET" &&
                            Number(newValue[item]) > Config.ACCOUNT_MAX_BUDGET) ||
                        (item === "EVENT_DEFAULT_LENGTH_DAYS" && Number(newValue[item]) > Config.EVENT_MAX_DAYS) ||
                        (item === "EVENT_DEFAULT_ACCOUNTS" && Number(newValue[item]) > Config.EVENT_MAX_ACCOUNTS)
                    ) {
                        errors[item] = "Value for event default cannot be higher than maximum value above.";
                    }
                    if (
                        (item === "ITEM_PAGE_SIZE" && Number(newValue[item]) > 60) ||
                        (item === "SUBITEM_PAGE_SIZE" && Number(newValue[item]) > 60)
                    ) {
                        errors[item] = "Maximum size is 60 items per table page.";
                    }
                }
            }
        });
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

    const resetValues = () => {
        setInputError({});
        setValue(Config);
    };

    const submit = () => {
        let newValue = value;
        if (!validateInputs(newValue)) {
            return;
        }
        Object.keys(newValue).forEach((item) => {
            if (typeof Config[item] === "number") {
                newValue[item] = Number(newValue[item]);
            }
        });
        dispatch(updateConfig(newValue));
    };

    ///////////////////
    // FORM + CONTENT
    ///////////////////

    const Modals = () => (
        <>
            <ConfirmationModal
                visible={modal.status === "undo"}
                action={resetValues}
                buttonText="Undo inputs"
                alert="warning"
            >
                Do you really want to revert your inputs and reset this form?
            </ConfirmationModal>
            <ConfirmationModal
                visible={modal.status === "default"}
                action={() => dispatch({ type: "config/resetToDefaults" })}
                buttonText="Load default values"
                alert="warning"
            >
                Do you really want to load the system configuration defaults? You will need to save this form to apply
                the default values.
            </ConfirmationModal>
            <ConfirmationModal
                visible={modal.status === "save"}
                action={submit}
                confirmationText="save"
                buttonText="Save"
                alert="warning"
            >
                Do you really want to update the configuration parameters with the new values? By confirming you might
                override system variables in the internal backend database, which might cause inconsistent or undesired
                behaviour. Make sure you are really doing the right thing here!
                <br />
                <strong>Use at your own risk and in exception cases only.</strong>
            </ConfirmationModal>
        </>
    );

    return (
        <AppLayout
            navigation={<Navigation />}
            breadcrumbs={
                <BreadcrumbGroup
                    items={[
                        { text: "Admin", href: "#" },
                        { text: "Accounts", href: "#/accounts" }
                    ]}
                />
            }
            contentType="default"
            tools={<SideHelp />}
            notifications={<NotificationFlashbar />}
            content={
                <Container header={<Header>Configuration settings</Header>}>
                    <Form
                        actions={
                            <SpaceBetween direction="horizontal" size="l">
                                <Button onClick={() => dispatch({ type: "modal/open", status: "default" })}>
                                    Load defaults
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => dispatch({ type: "modal/open", status: "undo" })}
                                >
                                    Undo inputs
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={() => dispatch({ type: "modal/open", status: "save" })}
                                    disabled={!isEmpty(inputError)}
                                >
                                    Save configuration
                                </Button>
                            </SpaceBetween>
                        }
                    >
                        <SpaceBetween size="l">
                            <Box>
                                <Header>Lease and event parameters</Header>
                                <ColumnLayout borders="vertical" columns={3}>
                                    <FormField
                                        label="Maximum duration per event (in days)"
                                        errorText={inputError.EVENT_MAX_DAYS}
                                    >
                                        <Input
                                            onChange={({ detail }) => updateFormValue({ EVENT_MAX_DAYS: detail.value })}
                                            value={value.EVENT_MAX_DAYS}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Maximum number of AWS accounts per event"
                                        errorText={inputError.EVENT_MAX_ACCOUNTS}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ EVENT_MAX_ACCOUNTS: detail.value })
                                            }
                                            value={value.EVENT_MAX_ACCOUNTS}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Maximum budget per AWS account"
                                        errorText={inputError.ACCOUNT_MAX_BUDGET}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ ACCOUNT_MAX_BUDGET: detail.value })
                                            }
                                            value={value.ACCOUNT_MAX_BUDGET}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Default event length (in days)"
                                        errorText={inputError.EVENT_DEFAULT_LENGTH_DAYS}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ EVENT_DEFAULT_LENGTH_DAYS: detail.value })
                                            }
                                            value={value.EVENT_DEFAULT_LENGTH_DAYS}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Default number of AWS accounts per event"
                                        errorText={inputError.EVENT_DEFAULT_ACCOUNTS}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ EVENT_DEFAULT_ACCOUNTS: detail.value })
                                            }
                                            value={value.EVENT_DEFAULT_ACCOUNTS}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Default budget per AWS account"
                                        errorText={inputError.EVENT_DEFAULT_ACCOUNT_BUDGET}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ EVENT_DEFAULT_ACCOUNT_BUDGET: detail.value })
                                            }
                                            value={value.EVENT_DEFAULT_ACCOUNT_BUDGET}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Default event length (additional hours)"
                                        errorText={inputError.EVENT_DEFAULT_LENGTH_HOURS}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ EVENT_DEFAULT_LENGTH_HOURS: detail.value })
                                            }
                                            value={value.EVENT_DEFAULT_LENGTH_HOURS}
                                        />
                                    </FormField>
                                </ColumnLayout>
                            </Box>
                            <Box>
                                <Header>Display preferences</Header>
                                <ColumnLayout borders="vertical" columns={3}>
                                    <FormField
                                        label="Format string for date + time fields"
                                        errorText={inputError.FORMAT_DATETIME}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ FORMAT_DATETIME: detail.value })
                                            }
                                            value={value.FORMAT_DATETIME}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Number of default past days to display in statistics"
                                        errorText={inputError.STATISTICS_DEFAULT_PRE_DAYS}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ STATISTICS_DEFAULT_PRE_DAYS: detail.value })
                                            }
                                            value={value.STATISTICS_DEFAULT_PRE_DAYS}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Number of lease records per lease table in details"
                                        errorText={inputError.SUBITEM_PAGE_SIZE}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ SUBITEM_PAGE_SIZE: detail.value })
                                            }
                                            value={value.SUBITEM_PAGE_SIZE}
                                        />
                                    </FormField>
                                    <FormField label="Format string for date fields" errorText={inputError.FORMAT_DATE}>
                                        <Input
                                            onChange={({ detail }) => updateFormValue({ FORMAT_DATE: detail.value })}
                                            value={value.FORMAT_DATE}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Number of default future days to display in statistics"
                                        errorText={inputError.STATISTICS_DEFAULT_POST_DAYS}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ STATISTICS_DEFAULT_POST_DAYS: detail.value })
                                            }
                                            value={value.STATISTICS_DEFAULT_POST_DAYS}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Number of table items per page"
                                        errorText={inputError.ITEM_PAGE_SIZE}
                                    >
                                        <Input
                                            onChange={({ detail }) => updateFormValue({ ITEM_PAGE_SIZE: detail.value })}
                                            value={value.ITEM_PAGE_SIZE}
                                        />
                                    </FormField>
                                    <FormField label="Format string for time fields" errorText={inputError.FORMAT_TIME}>
                                        <Input
                                            onChange={({ detail }) => updateFormValue({ FORMAT_TIME: detail.value })}
                                            value={value.FORMAT_TIME}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Website update interval in seconds"
                                        errorText={inputError.UPDATE_WEBSITE_INTERVAL}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ UPDATE_WEBSITE_INTERVAL: detail.value })
                                            }
                                            value={value.UPDATE_WEBSITE_INTERVAL}
                                        />
                                    </FormField>
                                    <FormField />
                                    <FormField
                                        label="Format string for date label in statistics charts"
                                        errorText={inputError.STATISTICS_X_AXIS_DATE_FORMAT}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ STATISTICS_X_AXIS_DATE_FORMAT: detail.value })
                                            }
                                            value={value.STATISTICS_X_AXIS_DATE_FORMAT}
                                        />
                                    </FormField>
                                    <FormField
                                        label="Hide success notification banner after (seconds)"
                                        errorText={inputError.HIDE_NOTIFICATION_DURATION}
                                    >
                                        <Input
                                            onChange={({ detail }) =>
                                                updateFormValue({ HIDE_NOTIFICATION_DURATION: detail.value })
                                            }
                                            value={value.HIDE_NOTIFICATION_DURATION}
                                        />
                                    </FormField>
                                </ColumnLayout>
                            </Box>
                        </SpaceBetween>
                    </Form>
                    <Modals />
                </Container>
            }
        />
    );
};

const SideHelp = () => (
    <HelpPanel header={<h2>Sandbox Accounts for Events</h2>}>
        <Box>
            <Header variant="h3">Configuration Options</Header>
            <Box>
                Here you can define multiple default values for your environment. Please be aware that some changes
                might be breaking existing resources, so ensure you know what you do.
            </Box>
        </Box>
    </HelpPanel>
);

export default AdminConfig;
