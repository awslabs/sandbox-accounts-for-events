#!/bin/bash
# This script is executed when an execution of AWS Nuke (via CodeBuild reset account job) failed. It provides the opportunity to
# execute some "middle" cleanup work before the next CodeBuild AWS Nuke run will execute.

echo "Executing fix-cleanup script"

# wait some time for last AWS Nuke API calls to finish
sleep 30

# assume role in AWS account that has just been cleaned up
echo "Assuming role in account $RESET_ACCOUNT"
aws sts assume-role --role-arn arn:aws:iam::$RESET_ACCOUNT:role/$RESET_ACCOUNT_ADMIN_ROLE_NAME --role-session-name NukeProcess > cred.json 
export s=$(jq -r '.Credentials.AccessKeyId' cred.json) 
export y=$(jq -r '.Credentials.SecretAccessKey' cred.json) 
export z=$(jq -r '.Credentials.SessionToken' cred.json)
export AWS_ACCESS_KEY_ID=$s
export AWS_SECRET_ACCESS_KEY=$y
export AWS_SESSION_TOKEN=$z

# Helping AWS Nuke:
# - AWS Nuke cannot deregister ADs from WorkSpaces: deregistering manually, so AWS Nuke can successfully delete them on next try
for i in $(aws workspaces describe-workspace-directories --query "Directories[].DirectoryId" --output text); 
do 
    echo "Deregistering WorkSpaces Directory id $i in account $RESET_ACCOUNT"
    aws workspaces deregister-workspace-directory --directory-id $i
done