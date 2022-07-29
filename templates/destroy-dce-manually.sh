#!/bin/bash

################################
#
#   Shell script to manually delete all DCER-related resources in your account.
#
#   Use this script as last resort when you need to delete all DCE backend resources and have lost your terraform state file(s)
#   This script will run very simplified loops over AWS resources and delete them. Some resources are filtered by containing "dce" in their name, some 
#   are not filtered at all (like all DynamoDB tables will be deleted). 
#   Make sure you do not have any other resources in your AWS account that might accidentally be deleted by this script as well!
#
################################
# !!! USE AT YOUR OWN RISK !!! #
################################

if [ "$1" ]; then
    profile_string="--profile $1"
else        
    profile_string=" "
fi

# LAMBDA
echo "### Lambdas ###"
dce_resources=$(aws lambda list-functions --query 'Functions[?contains(FunctionName, `dce`) == `true`].FunctionName' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting Lambda function $dce_resource"
    aws lambda delete-function --function-name $dce_resource $profile_string
done
dce_resources=$(aws lambda list-event-source-mappings --query 'EventSourceMappings[?contains(EventSourceArn, `dce`) == `true`].UUID' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting Lambda event source mapping $dce_resource"
    aws lambda delete-event-source-mapping --uuid $dce_resource $profile_string
done

# CLOUDWATCH ALARMS
echo "### CloudWatch Alarms ###"
dce_resources=$(aws cloudwatch describe-alarms --query 'MetricAlarms[?contains(AlarmName, `dce`) == `true`].AlarmName' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting alarm: $dce_resource"
    aws cloudwatch delete-alarms --alarm-names $dce_resource $profile_string
done

# APIGW
echo "### API-GW ###"
dce_resources=$(aws apigateway get-rest-apis --query 'items[?contains(name, `dce`) == `true`].id' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting API-GW: $dce_resource"
    aws apigateway delete-rest-api --rest-api-id $dce_resource $profile_string
done

# EVENTBRIDGE RULES
echo "### EventBridge Rules ###"
dce_resources=$(aws events list-rules --query 'Rules[?contains(Name, `dce`) == `true`].Name' --output text $profile_string)
for dce_resource in $dce_resources; do
    dce_subresources=$(aws events list-targets-by-rule --rule $dce_resource --query 'Targets[?contains(Id, `dce`) == `true`].Id' --output text $profile_string)
    echo "aa$dce_subresources"
    for dce_subresource in $dce_subresources; do
        echo "deleting Eventbridge rule target: $dce_subresource"
        aws events remove-targets --rule $dce_resource --ids $dce_subresource $profile_string
    done
    echo "deleting Eventbridge rule: $dce_resource"
    aws events delete-rule --name $dce_resource $profile_string
done

# DYNAMODB
echo "### DynamoDB Tables ###"
dce_resources=$(aws dynamodb list-tables --query 'TableNames[]' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting DynamoDB table: $dce_resource"
    aws dynamodb delete-table --table-name $dce_resource $profile_string --output text
done


# CODEBUILD
echo "### CodeBuild Projects ###"
dce_resources=$(aws codebuild list-projects --query 'projects[]' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting CodeBuild project: $dce_resource"
    aws codebuild delete-project --name $dce_resource $profile_string --output text
done

# SQS
echo "### SQS ###"
dce_resources=$(aws sqs list-queues --query 'QueueUrls[]' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting SQS queue: $dce_resource"
    aws sqs delete-queue --queue-url $dce_resource $profile_string --output text
done

# SNS
echo "### SNS ###"
dce_resources=$(aws sns list-subscriptions --query 'Subscriptions[?contains(Endpoint, `dce`) == `true`].SubscriptionArn' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting SNS subscription: $dce_resource"
    aws sns unsubscribe --subscription-arn $dce_resource $profile_string --output text
done
dce_resources=$(aws sns list-topics --query 'Topics[?contains(TopicArn, `dce`) == `true`].TopicArn' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting SNS topic: $dce_resource"
    aws sns delete-topic --topic-arn $dce_resource $profile_string --output text
done

# Cognito
echo "### Cognito ###"
dce_resources=$(aws cognito-idp list-user-pools --max-results 10 --query 'UserPools[?contains(Name, `dce`) == `true`].Id' --output text $profile_string)
for dce_resource in $dce_resources; do
    dce_subresources=$(aws cognito-idp describe-user-pool --user-pool-id $dce_resource --query 'UserPool.Domain' --output text $profile_string)
    for dce_subresource in $dce_subresources; do
        echo "deleting Cognito User Pool Domain: $dce_subresource"
        aws cognito-idp delete-user-pool-domain --user-pool-id $dce_resource --domain $dce_subresource $profile_string
    done
    echo "deleting Cognito User Pool: $dce_resource"
    aws cognito-idp delete-user-pool --user-pool-id $dce_resource $profile_string
done
dce_resources=$(aws cognito-identity list-identity-pools --max-results 10 --query 'IdentityPools[?contains(IdentityPoolName, `dce`) == `true`].IdentityPoolId' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting Cognito Identity Pool: $dce_resource"
    aws cognito-identity delete-identity-pool --identity-pool-id $dce_resource $profile_string
done

# SSM
echo "### SSM Parameter ###"
dce_resources=$(aws ssm get-parameters-by-path --path "/dce" --recursive --query 'Parameters[?contains(Name, `dce`) == `true`].Name' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting SSM Parameter $dce_resource"
    aws ssm delete-parameter --name $dce_resource $profile_string
done

# SES
echo "### SES email + config set ###"
dce_resources=$(aws ses list-identities --query 'Identities[]' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting SES email $dce_resource"
    aws ses delete-identity --identity $dce_resource $profile_string
done
dce_resources=$(aws ses list-configuration-sets --query 'ConfigurationSets[?contains(Name, `dce`) == `true`].Name' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting SES configuration set $dce_resource"
    aws ses delete-configuration-set --configuration-set-name $dce_resource $profile_string
done

# IAM
echo "### IAM ###"
dce_resources=$(aws iam list-roles --query 'Roles[?contains(RoleName, `dce`) == `true`].RoleName' --output text $profile_string)
for dce_resource in $dce_resources; do
    dce_subresources=$(aws iam list-attached-role-policies --role-name $dce_resource --query 'AttachedPolicies[].PolicyArn' --output text $profile_string)
    for dce_subresource in $dce_subresources; do
        echo "detaching IAM policy: $dce_subresource"
        aws iam detach-role-policy --role-name $dce_resource --policy-arn $dce_subresource $profile_string
    done
    dce_subresources=$(aws iam list-role-policies --role-name $dce_resource --query 'PolicyNames[]' --output text $profile_string)
    for dce_subresource in $dce_subresources; do
        echo "deleting IAM policy: $dce_subresource"
        aws iam delete-role-policy --role-name $dce_resource --policy-name $dce_subresource $profile_string
    done
    echo "deleting IAM role $dce_resource"
    aws iam delete-role --role-name $dce_resource $profile_string
done
dce_resources=$(aws iam list-policies --query 'Policies[?contains(PolicyName, `dce`) == `true`].Arn' --output text $profile_string)
for dce_resource in $dce_resources; do
    echo "deleting IAM policy Parameter $dce_resource"
    aws iam delete-policy --policy-arn $dce_resource $profile_string
done

