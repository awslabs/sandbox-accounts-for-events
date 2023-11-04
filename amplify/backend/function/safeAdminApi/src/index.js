const https = require("https");
const aws4 = require("aws4");
const { IAMClient, ListAttachedRolePoliciesCommand, ListAccountAliasesCommand } = require('@aws-sdk/client-iam');
const { STSClient, AssumeRoleCommand } = require('@aws-sdk/client-sts');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const apiUrl = new URL(process.env.DCE_API_GW);
const region = process.env.REGION;
const accountsTable = process.env.DCE_ACCOUNTS_TABLE;
const serviceName = "execute-api";

const stsClient = new STSClient({ region });
const ddbClient = new DynamoDBClient({ region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

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

const listAccounts = (context) => {
    const masterAccountId = context.invokedFunctionArn.split(":")[4];
    return invokeApi("accounts?limit=500", "GET")
        .then((response) => {
            if (response.message) return respondWithError("Failed to list accounts.", response.message);
            return respondWithSuccess("", {
                accounts: response,
                masterAccountId
            });
        })
        .catch((error) => respondWithError("Failed to list accounts.", error));
};

const registerAccount = ({ id, roleName }) => {
    if (!roleName)
        return respondWithError("Internal error while trying to register account.", "Parameter 'roleName' missing.");
    if (!id) return respondWithError("Internal error while trying to register account.", "Parameter 'id' missing.");

    const roleArn = "arn:aws:iam::" + id + ":role/" + roleName;

    return stsClient
        .send(new AssumeRoleCommand({
            RoleArn: roleArn,
            RoleSessionName: "testAdminLogin",
            DurationSeconds: 900
        }))
        .then((credentials) => {
            const iamClient = new IAMClient({
                credentials: {
                    accessKeyId: credentials.Credentials.AccessKeyId,
                    secretAccessKey: credentials.Credentials.SecretAccessKey,
                    sessionToken: credentials.Credentials.SessionToken
                }
            });
            return iamClient
                .send(new ListAttachedRolePoliciesCommand({ RoleName: roleName }))
                .then((policies) => {
                    if (!policies.AttachedPolicies.find((item) => item.PolicyName === "AdministratorAccess"))
                        return respondWithError(
                            "No 'AdministratorAccess' policy attached to role " +
                                roleName +
                                " in account " +
                                id +
                                ".",
                            error
                        );
                    return iamClient
                        .send(new ListAccountAliasesCommand({}))
                        .then((aliases) => {
                            if (aliases.AccountAliases.length === 0)
                                return respondWithError("No account alias found for account " + id + ".");
                            return invokeApi("accounts", "POST", {
                                adminRoleArn: roleArn,
                                id: id
                            })
                                .then((response) => {
                                    if (response.message)
                                        return respondWithError(
                                            "Failed to register account " + id + ".",
                                            response.message
                                        );
                                    return respondWithSuccess("Account " + id + " successfully registered.", response);
                                })
                                .catch((error) =>
                                    respondWithError("Failed to register account " + id + ".", error)
                                );
                        })
                        .catch((error) =>
                            respondWithError("Error trying to list account aliases for account " + id + ".", error)
                        );
                })
                .catch((error) =>
                    respondWithError(
                        "Error trying to list attached IAM policies for role " +
                            roleName +
                            " in account " +
                            id +
                            ".",
                        error
                    )
                );
        })
        .catch((error) =>
            respondWithError("Error trying to assume IAM role " + roleName + " in account " + id + ".", error)
        );
};

const updateAccount = ({ id, accountStatus, adminRoleArn }) => {
    if (!id) return respondWithError("Internal error while trying to update account.", "Parameter 'id' missing.");
    if (!accountStatus)
        return respondWithError("Internal error while trying to update account.", "Parameter 'accountStatus' missing.");
    if (!adminRoleArn)
        return respondWithError("Internal error while trying to update account.", "Parameter 'adminRoleArn' missing.");
    return ddbDocClient
        .send(new UpdateCommand({
            TableName: accountsTable,
            Key: {
                Id: id
            },
            UpdateExpression: "set AccountStatus = :s, AdminRoleArn=:r",
            ExpressionAttributeValues: {
                ":s": accountStatus,
                ":r": adminRoleArn
            },
            ReturnValues: "UPDATED_NEW"
        }))
        .then((response) =>
            respondWithSuccess("DynamoDB table record for account " + id + " successfully updated.", response)
        )
        .catch((error) =>
            respondWithError("Error trying to update DynamoDB table record for account " + id + ".", error)
        );
};

const removeAccount = ({ id }) => {
    if (!id) return respondWithError("Internal error while trying to remove account.", "Parameter 'id' missing.");
    return invokeApi("accounts/" + id, "DELETE")
        .then((response) => {
            if (response.error)
                return respondWithError("Failed to remove account " + id + ".", response.error.message);
            return respondWithSuccess("Account " + id + " successfully removed.", response);
        })
        .catch((error) => respondWithError("Failed to remove account " + id + ".", error));
};

exports.handler = async (event, context) => {
    console.log("Lambda invoked with the following parameters: ", event, context)
    let args = event.arguments

    if (!args)
        return respondWithError("Internal error while trying to execute account task.", "Event arguments missing.");
    if (!args.action)
        return respondWithError("Internal error while trying to execute account task.", "Parameter 'action' missing.");

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
            case "listAccounts":
                return listAccounts(context);
            case "updateAccount":
                return updateAccount(params);
            case "registerAccount":
                return registerAccount(params);
            case "removeAccount":
                return removeAccount(params);
            default:
                throw new Error("unknown API action '" + args.action + "'");
        }
    } catch (error) {
        return respondWithError("Internal error while trying to execute account task.", error);
    }
};
