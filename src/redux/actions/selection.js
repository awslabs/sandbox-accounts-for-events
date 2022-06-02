const initialState = {
    status: "unselected",
    id: undefined
};

const selection = (state = initialState, action) => {
    switch (action.type) {
        case "selection/set":
            return {
                ...state,
                status: "selected",
                id: action.id
            };
        case "selection/dismiss":
            return initialState;
        default:
            return state;
    }
};

export default selection;
