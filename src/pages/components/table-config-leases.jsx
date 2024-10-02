import { fetchAwsLoginUrl } from "../../redux/actions/aws_login";
import { Link, ProgressBar, Button } from "@cloudscape-design/components";
import { toColorBox } from "./utils";
import { useDispatch, useSelector } from "react-redux";

const LeaseInfoBox = ({ item }) => {
    let lifetimeText = "";
    let statusText = "";
    switch (item.leaseStatusReason) {
        case "Expired":
            lifetimeText = "expired on " + item.leaseStatusModifiedDate;
            statusText = "error";
            break;
        case "Destroyed":
            lifetimeText = "manually terminated";
            statusText = "error";
            break;
        case "OverBudget":
            lifetimeText = "budget exceeded on " + item.leaseStatusModifiedDate;
            statusText = "error";
            break;
        case "Active":
        default:
            lifetimeText = "expires on " + item.expiresDate;
            statusText = "in-progress";
    }
    return <ProgressBar value={item.expiresPercent} additionalInfo={lifetimeText} status={statusText} />;
};

const LeaseLoginButton = ({ item }) => {
    const AwsLogin = useSelector((state) => state.aws_login);
    const dispatch = useDispatch();

    return (
        <Button
            variant="inline-icon"
            iconName="external"
            onClick={() => dispatch(fetchAwsLoginUrl(item))}
            loading={AwsLogin.status === "loading"}
        />
    );
};

export const leasesTableColumnDefinition = [
    {
        id: "id",
        header: "Lease ID",
        sortingField: "id",
        cell: (item) => <Link href={"#/leases/" + item.id}>{item.id.slice(-12)}</Link>
    },
    {
        id: "leaseStatus",
        header: "Status",
        sortingField: "leaseStatus",
        cell: (item) => toColorBox(item.leaseStatus)
    },
    {
        id: "eventId",
        header: "Event ID",
        sortingField: "eventId",
        cell: (item) => (item.eventId ? <Link href={"#/events/" + item.eventId}>{item.eventId}</Link> : "-")
    },
    {
        id: "user",
        header: "User",
        sortingField: "user",
        cell: (item) => <Link href={"#/users/" + encodeURIComponent(item.user)}>{item.user}</Link>
    },
    {
        id: "leaseStatusReason",
        header: "Expiration",
        sortingField: "expiresOn",
        cell: (item) => <LeaseInfoBox item={item} />
    },
    {
        id: "budget",
        header: "Budget",
        sortingField: "spendAmount",
        cell: (item) => (
            <ProgressBar
                value={item.spendPercent}
                additionalInfo={item.spendAmount + " of " + item.budgetAmount + " " + item.budgetCurrency}
                status={item.spendPercent > 100 ? "error" : item.leaseStatus === "Active" ? "in-progress" : "success"}
            />
        )
    },
    {
        id: "accountId",
        header: "AWS account",
        sortingField: "accountId",
        cell: (item) => <Link href={"#/accounts/" + item.accountId}>{item.accountId}</Link>
    },
    {
        id: "accountLogin",
        header: "Log in",
        cell: (item) => (item.leaseStatus === "Active" ? <LeaseLoginButton item={item} /> : null)
    }
];
