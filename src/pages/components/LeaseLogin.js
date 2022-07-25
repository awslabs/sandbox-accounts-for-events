import { Button, Container, FormField, Input, SpaceBetween, Alert, Header } from "@cloudscape-design/components";
import { useState } from "react";
import { useParams } from "react-router";
import AwsLoginModal from "../modals/AwsLoginModal";
import { regExpAll, isEmpty } from "./utils.js";
import { useSelector, useDispatch } from "react-redux";
import { fetchAwsLoginUrl } from "../../redux/actions/aws_login";

const LeaseLogin = () => {
    const { urlParamEventId } = useParams();
    const [inputError, setInputError] = useState({});
    const [value, setValue] = useState(urlParamEventId);
    const Config = useSelector((state) => state.config);
    const AwsLogin = useSelector((state) => state.aws_login);
    const NotificationItem = useSelector((state) => state.notification);
    const dispatch = useDispatch();

    const validateInputs = (newValue, allowEmptyValues = false) => {
        let errors = {};
        if (!(allowEmptyValues && newValue === "") && !new RegExp(regExpAll(Config.LEASE_ID_REGEX)).test(newValue)) {
            errors.LEASE_ID = "Invalid lease ID format.";
        }
        setInputError(errors);
        return isEmpty(errors);
    };

    const updateFormValue = (update) => {
        validateInputs(update, true);
        setValue(update);
    };

    return (
        <Container>
            <SpaceBetween size="m">
                <FormField errorText={inputError.LEASE_ID} label="Enter your account lease id:">
                    <Input value={value} onChange={({ detail }) => updateFormValue(detail.value)} />
                </FormField>
                <Button
                    icon="external"
                    variant="primary"
                    loading={AwsLogin.status === "loading"}
                    onClick={() => dispatch(fetchAwsLoginUrl({ id: value }))}
                >
                    Open AWS account
                </Button>
                {NotificationItem.visible ? (
                    <Alert type="error" header={<Header>Error</Header>}>
                        {NotificationItem.content} Please contact your event support.
                    </Alert>
                ) : null}
                <AwsLoginModal />
            </SpaceBetween>
        </Container>
    );
};

export default LeaseLogin;
