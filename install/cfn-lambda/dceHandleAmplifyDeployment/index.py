import boto3
import os
import cfnresponse
import time

codecommit_client = boto3.client('codecommit')
amplify_client = boto3.client('amplify')
amplify_backendclient = boto3.client('amplifybackend')
s3 = boto3.resource('s3')
cloudformation_client = boto3.client('cloudformation')
repo = os.environ['AMPLIFY_REPO']
branch = os.environ['AMPLIFY_BRANCH']
app_id = os.environ['AMPLIFY_APP_ID']
env = os.environ['AMPLIFY_ENV']
delete_role_arn = os.environ['DELETE_ROLE_ARN']

def wait_for_amplify_deployment():
    deployStatus = "PENDING"
    while deployStatus in ["PENDING","PROVISIONING","RUNNING"]:
        print("Waiting 30s for Amplify deployment job to finish...")
        time.sleep(30)
        jobs = amplify_client.list_jobs(appId = app_id, branchName = env)
        print(jobs)
        deployStatus = jobs['jobSummaries'][0]['status']
    return deployStatus

def wait_for_amplify_backend_deletion(stack_name):
    deleteStatus = "DELETE_IN_PROGRESS"
    while deleteStatus in ["DELETE_IN_PROGRESS","UPDATE_COMPLETE","CREATE_COMPLETE"]:
        try:
            print("Waiting 30s for Amplify backend stack deletion to finish...")
            time.sleep(30)
            stacks = cloudformation_client.describe_stacks(StackName = stack_name)
            print(stacks)
            deleteStatus = stacks['Stacks'][0]['StackStatus']
        except Exception as e:
            print("Amplify backend stacks successfully deleted.", e)
            deleteStatus = "DELETE_COMPLETE"
    return deleteStatus

def handler(event, context):
    if event['RequestType'] == 'Create':
        try:
            parentCommit = codecommit_client.get_branch(
                repositoryName=repo,
                branchName=branch
            )
            codecommit_client.create_commit(
                repositoryName=repo,
                branchName=branch,
                parentCommitId = parentCommit['branch']['commitId'],
                putFiles=[{
                    'filePath': '/dummy_commit',
                    'fileContent': ''
                }]
            )
            print("Amplify deployment successfully started.")
            status = wait_for_amplify_deployment()
            if status == "SUCCEED":
                print("Amplify deployment successfully finished.")
                cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
            else:
                print("Amplify deployment failed executing: ", status)
                cfnresponse.send(event, context, cfnresponse.FAILED, {}, None, status)
        except Exception as e:
            print("Error when trying to deploy Amplify app: ", e)
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {})

    elif event['RequestType'] == 'Delete':
        try:
            backend = amplify_client.get_backend_environment(appId = app_id, environmentName = env)
            stack_name = backend["backendEnvironment"]["stackName"]
            stacks = cloudformation_client.describe_stacks(StackName = stack_name)
            cfn_output = [output for output in stacks["Stacks"][0]["Outputs"] if output["OutputKey"] == "DeploymentBucketName"]
            bucket_name = cfn_output[0]["OutputValue"]
            cloudformation_client.delete_stack(StackName = stack_name, RoleARN = delete_role_arn)
            print("Amplify backend stack deletion successfully started.")
            status = wait_for_amplify_backend_deletion(stack_name)
            if status == "DELETE_COMPLETE":
                print("Amplify backend stack successfully deleted.")
                cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
            else:
                print("Amplify backend stack failed deletion: ", status)
                cfnresponse.send(event, context, cfnresponse.FAILED, {}, None, status)
                
            try:
                bucket = s3.Bucket(bucket_name)
                bucket.objects.delete()
                bucket.delete()
                print(f"Amplify deployment bucket {bucket_name} successfully deleted.")
            except Exception as e:
                print(f"Amplify deployment bucket {bucket_name} could not be deleted:", e)
                print("Skipping deployment bucket deletion, manual cleanup necessary.")

        except Exception as e:
            print("Error when trying to delete Amplify backend stacks: ", e)
            cfnresponse.send(event, context, cfnresponse.FAILED, {}, event['PhysicalResourceId'], str(e))

    else:
        print(f"RequestType {event['RequestType']} will be ignored.")
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
