import { Box, Header, Modal, SpaceBetween, StatusIndicator } from "@cloudscape-design/components";
import { useDispatch, useSelector } from "react-redux";

const LogModal = () => {
    const Logs = useSelector((state) => state.logs);
    const dispatch = useDispatch();
    const closeModal = () => {
        dispatch({ type: "logs/dismiss" });
    };

    return (
        <Modal
            onDismiss={closeModal}
            visible={Logs.visible}
            closeAriaLabel="Close"
            size="large"
            header={<Header variant="h1">Account registration log</Header>}
        >
            <Box>
                {Object.entries(Logs.logs).map(([key, value]) => (
                    <SpaceBetween direction="horizontal" size="xxs" key={key}>
                        <StatusIndicator type={value.status} />
                        <Box>{value.text}</Box>
                    </SpaceBetween>
                ))}
            </Box>
        </Modal>
    );
};

export default LogModal;
