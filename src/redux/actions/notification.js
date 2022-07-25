import { ProgressBar } from "@cloudscape-design/components";

const createItem = ({ header, type, content, hasProgressBar, progressPercent, loading, hasAction }) => {
    return {
        visible: true,
        type,
        loading,
        header: header ?? (type ? type.toUpperCase() : undefined),
        content: hasProgressBar ? (
            <ProgressBar value={progressPercent ?? 0} additionalInfo={content} variant="flash" />
        ) : (
            content
        ),
        dismissible: true,
        dismissLabel: "Dismiss message",
        hasAction
    };
};

const initialState = {
    visible: false
};

const notification = (state = initialState, action) => {
    clearTimeout(state.timeoutHandler);
    switch (action.type) {
        case "notification/error":
            return createItem({
                type: "error",
                content: action.message,
                hasAction: action.hasAction,
                timeoutHandler: action.timeoutHandler
            });
        case "notification/success":
            return createItem({
                type: "success",
                content: action.message,
                hasAction: action.hasAction,
                timeoutHandler: action.timeoutHandler
            });
        case "notification/waiting":
            return createItem({
                type: "info",
                content: action.message,
                header: action.header,
                timeoutHandler: action.timeoutHandler
            });
        case "notification/terminated":
            return createItem({
                type: "error",
                content: action.message,
                header: action.header,
                timeoutHandler: action.timeoutHandler
            });
        case "notification/inProgress":
            return createItem({
                type: "info",
                loading: true,
                content: action.message,
                hasAction: action.hasAction
            });
        case "notification/withProgressBar":
            return createItem({
                type: "info",
                loading: true,
                hasProgressBar: true,
                content: action.message,
                header: action.header,
                progressPercent: action.progressPercent,
                hasAction: action.hasAction
            });
        case "notification/dismiss":
            return initialState;
        default:
            return state;
    }
};

export const autoDismiss = (action) => async (dispatch, getState) => {
    const duration = getState().config.HIDE_NOTIFICATION_DURATION;
    if (duration > 0)
        action.timeoutHandler = setTimeout(() => dispatch({ type: "notification/dismiss" }), duration * 1000);
    dispatch(action);
};

export default notification;
