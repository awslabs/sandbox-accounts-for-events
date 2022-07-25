import { Form, Link, Modal } from "@cloudscape-design/components";
import { useDispatch, useSelector } from "react-redux";
import ReactMarkdown from "react-markdown";
import termsAndConditionsText from "../components/termsAndConditionsText";

const AwsLoginModal = () => {
    const AwsLogin = useSelector((state) => state.aws_login);
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
            <ReactMarkdown>{termsAndConditionsText}</ReactMarkdown>
            <Form
                actions={
                    <Link external href={AwsLogin.url} variant="primary">
                        Accept & Open AWS Console
                    </Link>
                }
            />
        </Modal>
    );
};

export default AwsLoginModal;
