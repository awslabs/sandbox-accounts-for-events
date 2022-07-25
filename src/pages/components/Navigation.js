import { SideNavigation, SpaceBetween } from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const Navigation = () => {
    const User = useSelector((state) => state.current_user);
    const [NavigationItems, setNavigationItems] = useState([]);

    useEffect(() => {
        let navigation_items = [];
        if (User.isLoggedIn) {
            navigation_items.push({
                type: "section",
                text: "Account user",
                expanded: true,
                items: [{ type: "link", text: "Log in to your event", href: "#" }]
            });
            if (User.isOperator) {
                navigation_items.push({
                    type: "section",
                    text: "Operator",
                    expanded: true,
                    items: [
                        { type: "link", text: "Manage Events", href: "#/events" },
                        { type: "link", text: "Event Statistics", href: "#/events/statistics" },
                        { type: "link", text: "Budget Usage", href: "#/usage" }
                    ]
                });
            }
            if (User.isAdmin) {
                navigation_items.push({
                    type: "section",
                    text: "Administrator",
                    expanded: true,
                    items: [
                        { type: "link", text: "Manage Leases", href: "#/leases" },
                        { type: "link", text: "Manage AWS Accounts", href: "#/accounts" },
                        { type: "link", text: "Manage Users", href: "#/users" }
                    ]
                });
            }
        }
        setNavigationItems(navigation_items);
    }, [User.isLoggedIn, User.isOperator, User.isAdmin]);

    return (
        <SpaceBetween>
            <SideNavigation activeHref={0} items={NavigationItems}/>
        </SpaceBetween>
    );
};

export default Navigation;
