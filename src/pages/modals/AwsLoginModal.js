import { Link, Modal, Textarea, SpaceBetween, Box, Grid } from "@cloudscape-design/components";
import CopyClipboardIconButton from "../components/CopyClipboardIconButton";
import { useDispatch, useSelector } from "react-redux";
import ReactMarkdown from "react-markdown";
import termsAndConditionsText from "../components/termsAndConditionsText";
import { useState } from 'react';

const AwsLoginModal = () => {
    const AwsLogin = useSelector((state) => state.aws_login);
    const [ cliVisible, setCliVisible ] = useState(false);
    const dispatch = useDispatch();

    const closeModal = () => {
        dispatch({ type: "aws_login/dismiss" });
    };

    return (
        <Modal
            onDismiss={closeModal}
            visible={AwsLogin.status === "visible"}
            closeAriaLabel="Close modal"
            size="large"
            header="AWS Console Login Link"
        >
            <SpaceBetween size="xl">
                <ReactMarkdown>{termsAndConditionsText}</ReactMarkdown>
                <Grid gridDefinition={[{ colspan: 6 },{ colspan: 6 }]}>
                    <Link variant="secondary" onFollow={() => setCliVisible(visible => !visible)}>
                        {cliVisible ? <u>Hide AWS CLI credentials</u> : <u>Accept & Show AWS CLI credentials</u> }
                    </Link>
                    <Box float="right">
                        <Link external href={AwsLogin.url} variant="primary">
                            <b>Accept & Open AWS Console</b>
                        </Link>
                        </Box>
                </Grid>
                { cliVisible ?
                    <SpaceBetween size="s">
                        <Textarea disabled rows={8} value={AwsLogin.credentials}/>                
                        <Box textAlign="right">
                            copy credentials
                            <CopyClipboardIconButton content={AwsLogin.credentials}>
                                &nbsp;
                            </CopyClipboardIconButton>
                        </Box>
                    </SpaceBetween>
                : null }
            </SpaceBetween>            
        </Modal>
    );
};

export default AwsLoginModal;
