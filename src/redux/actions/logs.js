const initialState = {
    visible: false,
    logs: {}
};

const logs = (state = initialState, action) => {
    switch (action.type) {
        case "logs/addEntry":
            return {
                ...state,
                logs: {
                    ...state.logs,
                    [action.payload.id]: {
                        status: action.payload.status,
                        text:
                            (state.logs[action.payload.id] && state.logs[action.payload.id].text
                                ? state.logs[action.payload.id].text + "....."
                                : "") + action.payload.text
                    }
                }
            };
        case "logs/show":
            return {
                ...state,
                visible: true
            };
        case "logs/dismiss":
            return {
                ...state,
                visible: false
            };
            
        case "logs/clear":
            return initialState;
        default:
            return state;
    }
};

export default logs;
