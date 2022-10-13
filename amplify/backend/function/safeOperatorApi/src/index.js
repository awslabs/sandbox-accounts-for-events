const https = require("https");
const aws4 = require("aws4");
const AWS = require("aws-sdk");
const apiUrl = new URL(process.env.DCE_API_GW);
const region = process.env.REGION;
const leasesTable = process.env.DCE_LEASES_TABLE;
const serviceName = "execute-api";

const respondWithError = (message = "Internal error.", errorObject = {}) => {
    console.error(message, errorObject);
    return JSON.stringify({
        status: "error",
        message,
        errorObject
    });
};
const respondWithSuccess = (successMessage = "", body = {}) => {
    let response = {
        status: "success",
        body
    };
    if (successMessage !== "") {
        console.log(successMessage, body);
        response.successMessage = successMessage;
    }
    return JSON.stringify(response);
};

const invokeApi = (path, method, body = null) => {
    return new Promise((resolve, reject) => {
        const bodyString = JSON.stringify(body);
        let params = {
            hostname: apiUrl.hostname,
            service: serviceName,
            region: region,
            method: method,
            path: apiUrl.pathname + "/" + path
        };
        if (body !== null) {
            params.body = bodyString;
            params.headers = {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(bodyString)
            };
        }
        const httpRequest = https.request(aws4.sign(params), (result) => {
            let data = "";
            result.on("data", (chunk) => {
                data += chunk;
            });
            result.on("end", () => {
                let endResult;
                try {
                    endResult = JSON.parse(data.toString());
                } catch (e) {
                    endResult = data.toString();
                }
                resolve(endResult);
            });
            result.on("error", (error) => reject(error));
        });
        httpRequest.write(bodyString);
        httpRequest.end();
    });
};

const listLeases = () => {
    const getDate = (date) => {
        return new Date(date).toISOString().substring(0, 10);
    };

    return Promise.all([invokeApi("leases?limit=500", "GET"), invokeApi("usage?limit=1000", "GET")]).then((responses) => {
        if (responses.error) return respondWithError("Failed to list leases.", responses.error);
        if (responses[0].message) return respondWithError("Failed to list leases.", responses[0].message);
        if (responses[1].message) return respondWithError("Failed to list usage.", responses[1].message);
        if (!Array.isArray(responses[0])) return respondWithError("Failed to list leases.", responses[0]);
        if (!Array.isArray(responses[1])) return respondWithError("Failed to list leases.", responses[1]);
        return respondWithSuccess("", {
            leases: responses[0].map((lease) => ({
                ...lease,
                spendAmount: responses[1].reduce(
                    (sum, item) =>
                        item.principalId === lease.principalId &&
                        item.accountId === lease.accountId &&
                        getDate(item.startDate) >= getDate(lease.createdOn) &&
                        getDate(item.endDate) <= getDate(lease.expiresOn)
                            ? sum + parseFloat(item.costAmount)
                            : sum,
                    0.0
                )
            }))
        });
    });
};

const createLease = ({ budgetAmount, expiresOn, principalId, budgetNotificationEmails, budgetCurrency, user }) => {
    if (!budgetAmount)
        return respondWithError("Internal error while trying to create lease.", "Parameter 'budgetAmount' missing.");
    if (!expiresOn)
        return respondWithError("Internal error while trying to create lease.", "Parameter 'expiresOn' missing.");
    if (!principalId)
        return respondWithError("Internal error while trying to create lease.", "Parameter 'principalId' missing.");
    if (!budgetCurrency)
        return respondWithError("Internal error while trying to create lease.", "Parameter 'budgetCurrency' missing.");
    if (!budgetNotificationEmails)
        return respondWithError(
            "Internal error while trying to create lease.",
            "Parameter 'budgetNotificationEmails' missing."
        );
    if (!user) return respondWithError("Internal error while trying to create lease.", "Parameter 'user' missing.");

    return invokeApi("leases", "POST", {
        budgetAmount,
        expiresOn,
        principalId,
        budgetNotificationEmails,
        budgetCurrency
    })
        .then((response) => {
            if (response.error) {
                switch (response.error.code) {
                    case "ServerError":
                        if (response.error.message === "No Available accounts at this moment")
                            return respondWithError("No more free AWS accounts available.", response.error);
                        else return respondWithError("Failed to create lease for " + user + ".", response.error);
                    case "AlreadyExistsError":
                        return respondWithError("Found already existing lease for " + user + ".", response.error);
                    default:
                        return respondWithError("Failed to create lease for " + user + ".", response.error);
                }
            }
            return respondWithSuccess("Lease for " + user + " successfully created.", response);
        })
        .catch((error) => respondWithError("Failed to create lease for " + user + ".", error));
};

const updateLease = ({
    accountId,
    leaseStatus,
    leaseStatusReason,
    budgetAmount,
    expiresOn,
    principalId,
    budgetNotificationEmails,
    user
}) => {
    if (!leaseStatus)
        return respondWithError("Internal error while trying to update lease.", "Parameter 'leaseStatus' missing.");
    if (!leaseStatusReason)
        return respondWithError(
            "Internal error while trying to update lease.",
            "Parameter 'leaseStatusReason' missing."
        );
    if (!budgetAmount)
        return respondWithError("Internal error while trying to update lease.", "Parameter 'budgetAmount' missing.");
    if (!expiresOn)
        return respondWithError("Internal error while trying to update lease.", "Parameter 'expiresOn' missing.");
    if (!accountId)
        return respondWithError("Internal error while trying to update lease.", "Parameter 'accountId' missing.");
    if (!principalId)
        return respondWithError("Internal error while trying to update lease.", "Parameter 'principalId' missing.");
    if (!budgetNotificationEmails)
        return respondWithError(
            "Internal error while trying to update lease.",
            "Parameter 'budgetNotificationEmails' missing."
        );
    if (!user) return respondWithError("Internal error while trying to update lease.", "Parameter 'user' missing.");
    const ddb = new AWS.DynamoDB.DocumentClient({
        region: region
    });
    return ddb
        .update({
            TableName: leasesTable,
            Key: {
                AccountId: accountId,
                PrincipalId: principalId
            },
            UpdateExpression:
                "set LeaseStatus = :s, LeaseStatusReason=:r, BudgetAmount=:b, ExpiresOn=:e, BudgetNotificationEmails=:n",
            ExpressionAttributeValues: {
                ":s": leaseStatus,
                ":r": leaseStatusReason,
                ":b": budgetAmount,
                ":e": expiresOn,
                ":n": budgetNotificationEmails
            },
            ReturnValues: "UPDATED_NEW"
        })
        .promise()
        .then((response) =>
            respondWithSuccess("DynamoDB table record for lease for " + user + " successfully updated.", response)
        )
        .catch((error) =>
            respondWithError("Error trying to update DynamoDB table record for lease for " + user + ".", error)
        );
};

const terminateLease = ({ user, principalId, accountId }) => {
    if (!principalId)
        return respondWithError("Internal error while trying to terminate lease.", "Parameter 'principalId' missing.");
    if (!accountId)
        return respondWithError("Internal error while trying to terminate lease.", "Parameter 'accountId' missing.");
    if (!user) return respondWithError("Internal error while trying to terminate lease.", "Parameter 'user' missing.");
    return invokeApi("leases", "DELETE", {
        principalId,
        accountId
    })
        .then((response) => {
            if (response.message)
                return respondWithError("Failed to terminate lease for " + user + ".", response.message);
            return respondWithSuccess("Lease for " + user + " successfully terminated.", response);
        })
        .catch((error) => respondWithError("Failed to terminate lease for " + user + ".", error));
};

const deleteLease = ({ accountId, principalId, user }) => {
    if (!principalId)
        return respondWithError("Internal error while trying to delete lease.", "Parameter 'principalId' missing.");
    if (!accountId)
        return respondWithError("Internal error while trying to delete lease.", "Parameter 'accountId' missing.");
    if (!user) return respondWithError("Internal error while trying to delete lease.", "Parameter 'user' missing.");
    const ddb = new AWS.DynamoDB.DocumentClient({
        region: region
    });
    return ddb
        .delete({
            TableName: leasesTable,
            Key: {
                AccountId: accountId,
                PrincipalId: principalId
            }
        })
        .promise()
        .then((response) => respondWithSuccess("Lease for " + user + " successfully deleted.", response))
        .catch((error) => respondWithError("Error trying to delete lease for " + user + ".", error));
};

const getStatistics = () => {
    return Promise.all([invokeApi("leases?limit=500", "GET"), invokeApi("accounts?limit=500", "GET"), invokeApi("usage?limit10500", "GET")])
        .then((responses) => {
            if (responses.error) return respondWithError("Failed to load statistics data.", responses.error);
            if (
                responses[0].message ||
                responses[1].message ||
                responses[2].message ||
                !Array.isArray(responses[0]) ||
                !Array.isArray(responses[1]) ||
                !Array.isArray(responses[2])
            )
                return respondWithError("Failed to load statistics data.", responses);

            return respondWithSuccess("Statistics data successfully compiled.", {
                leases: responses[0],
                accounts: responses[1],
                usage: responses[2]
            });
        })
        .catch((error) => respondWithError("Error trying to retrieve data for statistics.", error));
};

const listUsage = () => {
    return Promise.all([invokeApi("leases?limit=500", "GET"), invokeApi("usage?limit=1000", "GET")])
        .then((responses) => {
            if (responses.error) return respondWithError("Failed to load usage data.", responses.error);
            if (
                responses[0].message ||
                responses[1].message ||
                !Array.isArray(responses[0]) ||
                !Array.isArray(responses[1])
            )
                return respondWithError("Failed to load usage data.", responses.message);

            return respondWithSuccess("Usage data successfully loaded.", {
                leases: responses[0],
                usage: responses[1]
            });
        })
        .catch((error) => respondWithError("Error trying to retrieve usage data.", error));
};

exports.handler = async ({ arguments: args }) => {
    if (!args) return respondWithError("Internal error while trying to execute task.", "Event arguments missing.");
    if (!args.action)
        return respondWithError("Internal error while trying to execute task.", "Parameter 'action' missing.");

    let params;
    if (args.paramJson) {
        try {
            params = JSON.parse(args.paramJson);
        } catch (e) {
            return respondWithError("'paramJson' contains malformed JSON string.");
        }
    }

    try {
        switch (args.action) {
            case "listLeases":
                return listLeases();
            case "updateLease":
                return updateLease(params);
            case "createLease":
                return createLease(params);
            case "terminateLease":
                return terminateLease(params);
            case "deleteLease":
                return deleteLease(params);
            case "getStatistics":
                return getStatistics();
            case "listUsage":
                return listUsage();
            default:
                throw new Error("unknown API action '" + args.action + "'");
        }
    } catch (error) {
        return respondWithError("Internal error while trying to execute task.", error);
    }
};
