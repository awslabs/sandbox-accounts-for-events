const moment = require("moment");
const https = require("https");
const aws4 = require("aws4");
const apiUrl = new URL(process.env.DCE_API_GW);
const region = process.env.REGION;
const serviceName = "execute-api";
const { DynamoDBClient, ListTablesCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, ListUserPoolsCommand, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');


const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
let eventsTable

const cognitoClient = new CognitoIdentityProviderClient({ region })
let userPoolId

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

const getEndUserEvent = ({ id }) => {
    if (!eventsTable)
        return respondWithError("Failed to get data for event ID " + id + ".")

    return ddbDocClient.send(new GetCommand({ TableName: eventsTable, Key: { id } }))
    .then((response) => {
        if (response.Item) {
            return respondWithSuccess("Successfully got DynamoDB event item",{
                id: response.Item.id,
                eventStatus: response.Item.eventStatus,
                eventName: response.Item.eventName
            })
        } else { 
            return respondWithError('Could not find matching event for event ID "' + id + '". Please double check if your event ID is correct or ask your event operator for help.')
        }
    })
    .catch((error) =>
        respondWithError("Failed to get data for event ID " + id + ".", error)
    );
};


const getLeaseLoginUrl = ({ id }, user) => {
    return invokeApi("leases/" + id + "/auth", "POST", "")
        .then((response) => {
            if (response.consoleUrl) return response;
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

const getAwsLoginUrlForEvent = async ({eventId}, event) => {
    
    if (!eventId) return respondWithError("Internal error while trying to log in.", "Parameter 'eventId' missing.");

    if (!userPoolId)
        return respondWithError("Failed to get user authentication pool, cannot claim an AWS account.")

    if (!eventsTable)
        return respondWithError("Failed to get data for event ID " + eventId + ".")

    return cognitoClient.send(new AdminGetUserCommand({
            UserPoolId: userPoolId,
            Username: event.identity.username
        }))
        .then(cognitoResponse => {
            const user = cognitoResponse.UserAttributes.find(attr => attr.Name == "email").Value
            let principalId = eventId + "__" + user.replace(/[^a-zA-Z0-9]/g, "+")
            return ddbDocClient.send(new GetCommand({ TableName: eventsTable, Key: { id: eventId } }))
                .then(response => {
                    if (response.Item) {
                        return invokeApi("leases?limit=500", "GET")
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
                                    if (leases.filter((lease) => lease.principalId.startsWith(eventId)).length >= response.Item.maxAccounts)
                                        return respondWithError("No more free AWS accounts available for this event.");
                                    return invokeApi("leases", "POST", {
                                        budgetAmount: response.Item.eventBudget,
                                        expiresOn: moment
                                            .unix(response.Item.eventOn)
                                            .add(response.Item.eventDays, "days")
                                            .add(response.Item.eventHours, "hours")
                                            .unix(),
                                        principalId,
                                        budgetNotificationEmails: [user],
                                        budgetCurrency: "USD"
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
                
                    } else {
                        return respondWithError(
                            "Your EventId " + eventId + " is invalid. Please contact your event operator for help."
                        );
                    }
                })
                .catch((error) => respondWithError("Failed to get data for event ID " + eventId + ".", error));
        })
        .catch(error => respondWithError("Failed to get user authentication data, cannot claim an AWS account.", error))
};

const getAwsLoginUrlForLease = ({ id }) => {
    if (!id) return respondWithError("Internal error while trying to log in.", "Parameter 'id' missing.");
    return invokeApi("leases/" + id + "/auth", "POST", "")
        .then((response) => {
            if (response.consoleUrl) return response;
            else throw response;
        })
        .then((url) => {
            if (url.message)
                return respondWithError("Failed to provide login URL for lease " + id + ".", url.message);
            return respondWithSuccess("Successfully created login URL for lease " + id + ".", url);
        })
        .catch((error) => respondWithError("Failed to provide login URL for lease " + id + ".", error));
};

exports.handler = async (event, context) => {
    console.log("Lambda invoked with the following parameters: ", event, context)
    let args = event.arguments

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
    
    if (!eventsTable) {
        const tables = await ddbClient.send(new ListTablesCommand())
        eventsTable = tables.TableNames.find(name => name.startsWith("Event-"))
    }

    if (!userPoolId) {
        const userPools = await cognitoClient.send(new ListUserPoolsCommand({ MaxResults: 10 }))
        userPoolId = userPools.UserPools.find(userPool => userPool.Name.startsWith("safeafe5208f")).Id
    }

    try {
        switch (args.action) {
            case "getEndUserEvent":
                return getEndUserEvent(params);
            case "getAwsLoginUrlForEvent":
                return getAwsLoginUrlForEvent(params, event);
            case "getAwsLoginUrlForLease":
                return getAwsLoginUrlForLease(params);
            default:
                throw new Error("unknown API action '" + args.action + "'");
        }
    } catch (error) {
        return respondWithError("Internal error while trying to execute login task.", error);
    }
};
