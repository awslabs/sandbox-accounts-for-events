import { Box, SpaceBetween, Icon } from "@cloudscape-design/components";

export const isEmpty = (item) => Object.keys(item).length === 0;

export const toColorBox = (status, text = "", inactiveOnly = false) => {
    if (text === "") text = status;
    if (inactiveOnly && status !== "Inactive") status = "default";
    switch (status) {
        case "success":
        case "Ready":
        case "Active":
        case "Running":
            return <Box color="text-status-success">{text}</Box>;
        case "Destroyed":
        case "Expired":
        case "Inactive":
            return <Box color="text-status-inactive">{text}</Box>;
        case "info":
        case "Leased":
        case "Waiting":
            return <Box color="text-status-info">{text}</Box>;
        case "Rollback":
        case "OverBudget":
        case "error":
        case "NotReady":
        case "Terminated":
            return <Box color="text-status-error">{text}</Box>;
        default:
            return <Box color="text-status-inherit">{text}</Box>;
    }
};

export const toIconColorBox = (status) => {
    switch (status) {
        case "Waiting":
            return toColorBox(
                status,
                <SpaceBetween direction="horizontal" size="xxs">
                    <Icon name="status-pending" />
                    <Box color="text-status-info">{status}</Box>
                </SpaceBetween>
            );
        case "Running":
            return toColorBox(
                status,
                <SpaceBetween direction="horizontal" size="xxs">
                    <Icon name="status-in-progress" />
                    <Box color="text-status-success">{status}</Box>
                </SpaceBetween>
            );
        case "Terminated":
            return toColorBox(
                status,
                <SpaceBetween direction="horizontal" size="xxs">
                    <Icon name="status-negative" />
                    <Box color="text-status-error">{status}</Box>
                </SpaceBetween>
            );
        default:
            return <Box color="text-status-inherit">{status}</Box>;
    }
};

export const regExpAll = (exp) => "^" + exp + "$";
