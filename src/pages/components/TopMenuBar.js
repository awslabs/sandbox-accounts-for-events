import { Auth } from "aws-amplify";
import { Button, Link, Header, TopNavigation } from "@cloudscape-design/components";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { TopNavigationi18nStrings } from "../components/labels";
import ConfirmationModal from "../modals/ConfirmationModal";
import { useNavigate } from "react-router-dom";

const TopMenuBar = () => {
    const User = useSelector((state) => state.current_user);
    const modal = useSelector((state) => state.modal);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const deleteMe = () => {
        if (User.isAdmin) {
            dispatch({ type: "notification/error", message: "As an admin you cannot delete your own account." });
            return;
        }

        Auth.deleteUser()
            .then(() => {
                dispatch({ type: "current_user/clear" });
                navigate("/");
            })
            .catch((error) => {
                console.error("Error deleting user profile", error);
                dispatch({ type: "notification/error", message: "Error deleting your own user profile." });
            });
    };

    const signOut = () => {
        Auth.signOut().then(() => {
            dispatch({ type: "current_user/clear" });
            navigate("/");
        });
    };

    let utilities = [];
    if (User.isAdmin)
        utilities = utilities.concat({
            type: "menu-dropdown",
            iconName: "settings",
            ariaLabel: "Settings",
            title: "Settings",
            items: [
                {
                    text: "Configuration",
                    href: "#/config"
                }
            ]
        });

    utilities = utilities.concat({
        type: "menu-dropdown",
        iconName: "user-profile",
        text: User.email,
        items: [
            {
                items: [
                    {
                        text: (
                            <Link
                                onFollow={() =>
                                    User.isAdmin
                                        ? dispatch({ type: "modal/open", status: "cannotDeleteMyself" })
                                        : dispatch({ type: "modal/open", status: "deleteMyself" })
                                }
                            >
                                Delete my user profile
                            </Link>
                        )
                    }
                ]
            },
            {
                text: (
                    <Button variant="primary" onClick={signOut}>
                        Sign out
                    </Button>
                )
            }
        ]
    });

    return (
        <>
            <TopNavigation
                identity={{
                    href: "#",
                    title: "Sandbox Accounts for Events"
                }}
                utilities={utilities}
                i18nStrings={TopNavigationi18nStrings}
                className="top-navigation"
            />
            <ConfirmationModal
                visible={modal.status === "deleteMyself"}
                action={deleteMe}
                confirmationText="delete me"
                buttonText="Delete your account"
                alert="error"
            >
                Do you really want to delete your user account "{User.email}"?
                <br />
                <strong>You will not be able to log in to Sandbox Accounts for Events any more!</strong>
            </ConfirmationModal>
            <ConfirmationModal
                visible={modal.status === "cannotDeleteMyself"}
                action={() => undefined}
                buttonText="Ok"
                alert="error"
                header={<Header>Error</Header>}
            >
                Sorry, but for security reasons admins cannot delete their own user accounts.
            </ConfirmationModal>
        </>
    );
};

export default TopMenuBar;
