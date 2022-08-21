const https = require("https");
const aws4 = require("aws4");
const apiUrl = new URL(process.env.DCE_API_GW);
const region = process.env.REGION;
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

const getLeaseLoginUrl = ({ id }, user) => {
    return invokeApi("leases/" + id + "/auth", "POST", "")
        .then((response) => {
            if (response.consoleUrl) return response.consoleUrl.replace("\\u0026", "?");
            else throw response;
        })
        .then((url) => {
            if (url.message)
                return respondWithError(
                    "Failed to provide login URL for lease " + id + " for user " + user + ".",
                    url.message
                );
            return respondWithSuccess(
                "Assigned lease " + id + " for user " + user + ". Successfully created login URL.",
                url
            );
        })
        .catch((error) =>
            respondWithError("Failed to provide login URL for lease " + id + " for user " + user + ".", error)
        );
};

const getAwsLoginUrlForEvent = ({
    eventId,
    budgetAmount,
    budgetCurrency,
    expiresOn,
    principalId,
    user,
    maxAccounts
}) => {
    if (!principalId)
        return respondWithError("Internal error while trying to log in.", "Parameter 'principalId' missing.");
    if (!budgetAmount)
        return respondWithError("Internal error while trying to log in.", "Parameter 'budgetAmount' missing.");
    if (!budgetCurrency)
        return respondWithError("Internal error while trying to log in.", "Parameter 'budgetCurrency' missing.");
    if (!expiresOn) return respondWithError("Internal error while trying to log in.", "Parameter 'expiresOn' missing.");
    if (!eventId) return respondWithError("Internal error while trying to log in.", "Parameter 'eventId' missing.");
    if (!user) return respondWithError("Internal error while trying to log in.", "Parameter 'user' missing.");
    if (!maxAccounts)
        return respondWithError("Internal error while trying to log in.", "Parameter 'maxAccounts' missing.");

    return invokeApi("leases", "GET")
        .then((leases) => {
            if (leases.message) return respondWithError("Failed to list leases.", leases.message);

            let foundLease = leases.find((item) => item.principalId === principalId);
            if (foundLease) {
                switch (foundLease.leaseStatus) {
                    case "Active":
                        return getLeaseLoginUrl(foundLease, user);
                    case "Expired":
                        return respondWithError(
                            "Your AWS account has expired its lifetime and has been terminated now."
                        );
                    case "OverBudget":
                        return respondWithError(
                            "Your AWS account has reached its maximum budget and has been terminated now."
                        );
                    case "Inactive":
                        return respondWithError("Your AWS account has been manually terminated.");
                    default:
                        return respondWithError("Your account is not available for logging in.");
                }
            } else {
                if (leases.filter((lease) => lease.principalId.startsWith(eventId)).length >= maxAccounts)
                    return respondWithError("No more free AWS accounts available for this event.");
                return invokeApi("leases", "POST", {
                    budgetAmount,
                    expiresOn,
                    principalId,
                    budgetNotificationEmails: [user],
                    budgetCurrency
                })
                    .then((newLease) => {
                        if (newLease.error) {
                            switch (newLease.error.code) {
                                case "ServerError":
                                    if (newLease.error.message === "No Available accounts at this moment")
                                        return respondWithError("No more free AWS accounts available.", newLease.error);
                                    else
                                        return respondWithError(
                                            "Failed to create lease for " + user + ".",
                                            newLease.error
                                        );
                                case "AlreadyExistsError":
                                    return respondWithError(
                                        "Found already existing lease for " + user + ".",
                                        newLease.error
                                    );
                                default:
                                    return respondWithError(
                                        "Failed to create lease for " + user + ".",
                                        newLease.error
                                    );
                            }
                        }
                        return getLeaseLoginUrl(newLease, user);
                    })
                    .catch((error) => respondWithError("Failed to create lease for " + user + ".", error));
            }
        })
        .catch((error) => respondWithError("Failed to list leases.", error));
};

const getAwsLoginUrlForLease = ({ id }) => {
    if (!id) return respondWithError("Internal error while trying to log in.", "Parameter 'id' missing.");
    return invokeApi("leases/" + id + "/auth", "POST", "")
        .then((response) => {
            if (response.consoleUrl) return response.consoleUrl.replace("\\u0026", "?");
            else throw response;
        })
        .then((url) => {
            if (url.message)
                return respondWithError("Failed to provide login URL for lease " + id + ".", url.message);
            return respondWithSuccess("Successfully created login URL for lease " + id + ".", url);
        })
        .catch((error) => respondWithError("Failed to provide login URL for lease " + id + ".", error));
};

exports.handler = async ({ arguments: args }) => {
    if (!args)
        return respondWithError("Internal error while trying to execute lease task.", "Event arguments missing.");
    if (!args.action)
        return respondWithError("Internal error while trying to execute lease task.", "Parameter 'action' missing.");

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
            case "getAwsLoginUrlForEvent":
                return getAwsLoginUrlForEvent(params);
            case "getAwsLoginUrlForLease":
                return getAwsLoginUrlForLease(params);
            default:
                throw new Error("unknown API action '" + args.action + "'");
        }
    } catch (error) {
        return respondWithError("Internal error while trying to execute login task.", error);
    }
};
