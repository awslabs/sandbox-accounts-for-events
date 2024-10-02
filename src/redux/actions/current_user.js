const initialState = {
    isLoggedIn: false
};

const current_user = (state = initialState, action) => {
    switch (action.type) {
        case "current_user/set":
            return {
                ...action.payload,
                isLoggedIn: true
            };
        case "current_user/clear":
            return initialState;
        default:
            return state;
    }
};

export const setCurrentUser = (data) => (dispatch, getState) => {
    if (!data.signInDetails)
        return
    const config = getState().config;
    let useremail = data.signInDetails.loginId;
    let username = useremail.substring(0, useremail.indexOf("@"));
    username = username[0].toUpperCase() + username.slice(1);
    let current_user = {
        email: useremail,
        name: username
    };
    if (data.groups) {
        current_user.isAdmin = data.groups.find((group) => group === config.ADMIN_GROUP) !== undefined;
        current_user.isOperator = data.groups.find((group) => group === config.OPERATOR_GROUP) !== undefined;
    }
    dispatch({ type: "current_user/set", payload: current_user });
};

export default current_user;
