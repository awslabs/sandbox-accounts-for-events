const initialState = {
    status: "none",
    confirm: false,
    item: {},
    items: []
};

const modal = (state = initialState, action) => {
    switch (action.type) {
        case "modal/open":
            return {
                ...state,
                status: action.status,
                item: action.item ?? {},
                items: action.items ?? [],
                confirm: false
            };
        case "modal/confirm":
            return {
                ...state,
                confirm: true
            };
        case "modal/dismiss":
            return initialState;
        default:
            return state;
    }
};

export default modal;
