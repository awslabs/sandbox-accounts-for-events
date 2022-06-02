#!/bin/bash
# This script is executed when an execution of AWS Nuke (via CodeBuild reset account job) finished successfully.
# It provides the opportunity to re-create default resources or cleanup stuff AWS Nuke was not aware of.

echo "Executing post-cleanup script"

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

# re-create the default VPCs that have been removed by AWS Nuke before
echo "Creating defaut VPCs in us-east-1 and us-west-2 in account $RESET_ACCOUNT"
aws ec2 create-default-vpc --region us-east-1
aws ec2 create-default-vpc --region us-west-2
