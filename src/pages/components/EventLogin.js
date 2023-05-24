import { Alert, Box, Button, Container, FormField, Header, Input, SpaceBetween } from "@cloudscape-design/components";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "react-router";
import AwsLoginModal from "../modals/AwsLoginModal";
import moment from "moment";
import { isEmpty, regExpAll } from "./utils.js";
import { fetchAwsLoginUrl } from "../../redux/actions/aws_login";
import { fetchEndUserEvent } from "../../redux/actions/events";

const EventLogin = () => {
    const { urlParamEventId } = useParams();
    const [value, setValue] = useState("");
    const [inputError, setInputError] = useState({});
    const [valueChangedOnce, setValueChangedOnce] = useState(false);
    const NotificationItem = useSelector((state) => state.notification);
    const User = useSelector((state) => state.current_user);
    const Config = useSelector((state) => state.config);
    const Event = useSelector((state) => state.events);
    const AwsLogin = useSelector((state) => state.aws_login);
    const dispatch = useDispatch();

    const clearEvent = () => {
        dispatch({ type: "event/dismiss" });
        dispatch({ type: "notification/dismiss" });
        setInputError({});
        setValueChangedOnce(true);
    };

    const validateInputs = (newValue, allowEmptyValues = false) => {
        let errors = {};
        if (!(allowEmptyValues && newValue === "") && !new RegExp(regExpAll(Config.EVENT_ID_REGEX)).test(newValue)) {
            errors.EVENT_ID =
                "Invalid event ID format. Event ID must consist of " +
                Config.EVENT_ID_LENGTH +
                " alphanumeric characters.";
        }
        setInputError(errors);
        return isEmpty(errors);
    };

    const submit = () => {
        dispatch({ type: "notification/dismiss" });
        if (!validateInputs(value)) {
            return;
        }
        dispatch(fetchEndUserEvent(value));
    };

    const updateFormValue = (update) => {
        validateInputs(update, true);
        setValue(update);
    };

    useEffect(() => {
        if (!valueChangedOnce && isEmpty(Event.item) && urlParamEventId && User.isLoggedIn) {
            dispatch(fetchEndUserEvent(urlParamEventId));
        }
    }, [Event.item, urlParamEventId, dispatch, valueChangedOnce, User]);

    useEffect(() => {
        if (!Event.item.eventStatus) return;
        switch (Event.item.eventStatus) {
            case "Waiting":
                dispatch({
                    type: "notification/waiting",
                    message:
                        "This event hasn't been started yet. Please wait until your event operator allows you to log into your AWS account and then refresh this browser page."
                });
                return;
            case "Running":
                return;
            case "Terminated":
                dispatch({
                    type: "notification/terminated",
                    message: "This event has already been terminated by your event operator."
                });
                return;
            default:
                dispatch({
                    type: "notification/error",
                    message: "Internal event status error. Please ask your event support for help."
                });
        }
    }, [Event.item, dispatch]);

    useEffect(() => {
        dispatch({ type: "event/dismiss" });
        dispatch({ type: "notification/dismiss" });
    }, [dispatch]);

    /////////
    // MAIN
    /////////

    return (
        <Container>
            <SpaceBetween size="xl">
                {!Event.item.id ? (
                    <SpaceBetween size="m">
                        <FormField
                            description="Ask your event support staff for details"
                            errorText={inputError.EVENT_ID}
                            label="Enter the event id for today's event:"
                        >
                            <Input value={value} onChange={({ detail }) => updateFormValue(detail.value)} />
                        </FormField>
                        <Button variant="primary" onClick={submit} loading={Event.status === "loading"}>
                            Log in to event
                        </Button>
                    </SpaceBetween>
                ) : (
                    <>
                        <Header variant="h1" actions={<Button onClick={clearEvent}>Change event</Button>}>
                            Welcome to "{Event.item.eventName}"
                        </Header>
                        {User.isOperator || User.isAdmin ? (
                            <Alert type="warning" header="IMPORTANT for operators & admins">
                                Be careful: Clicking on the button below below will consume an AWS account from the
                                account pool list.
                            </Alert>
                        ) : null}
                        <Box>
                            Click the button below to be forwarded to your AWS account. If this is the first time you
                            are using your email address to log into an AWS account for this event, we will assign a
                            new, fresh AWS account to you. If you have already been logging into an AWS account with
                            your email address before, we will log you into the same account again so you can continue
                            your work.
                        </Box>
                        <Button
                            icon="external"
                            variant="primary"
                            loading={AwsLogin.status === "loading"}
                            onClick={() =>
                                dispatch(
                                    fetchAwsLoginUrl({
                                        principalId:
                                            Event.item.id +
                                            Config.EVENT_PRINCIPAL_SEPARATOR +
                                            User.email.replace(/[^a-zA-Z0-9]/g, Config.EVENT_EMAIL_SUBST),
                                        budgetAmount: Event.item.eventBudget,
                                        budgetCurrency: Config.BUDGET_CURRENCY,
                                        user: User.email,
                                        expiresOn: moment
                                            .unix(Event.item.eventOn)
                                            .add(Event.item.eventDays, "days")
                                            .add(Event.item.eventHours, "hours")
                                            .unix(),
                                        maxAccounts: Event.item.maxAccounts,
                                        eventId: Event.item.id
                                    })
                                )
                            }
                            disabled={NotificationItem.visible}
                        >
                            Open AWS Console
                        </Button>
                        <AwsLoginModal />
                    </>
                )}
                <Alert
                    type={NotificationItem.type}
                    header={NotificationItem.header}
                    onDismiss={() => dispatch({ type: "notification/dismiss" })}
                    visible={NotificationItem.visible}
                    dismissAriaLabel="Close error"
                    dismissible
                >
                    {NotificationItem.content}
                </Alert>
            </SpaceBetween>
        </Container>
    );
};

export default EventLogin;
