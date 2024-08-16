import boto3
import botocore.exceptions
import os
import cfnresponse
import time

amplify_client = boto3.client('amplify')
cloudformation_client = boto3.client('cloudformation')
codebuild_client = boto3.client('codebuild')

amplify_deploy_project = os.environ['AMPLIFY_DEPLOY_PROJECT']
branch = os.environ['AMPLIFY_BRANCH']
app_id = os.environ['AMPLIFY_APP_ID']
env = os.environ['AMPLIFY_ENV']
delete_role_arn = os.environ['DELETE_ROLE_ARN']


# helper functon to regularly poll CodeBuild project execution status until finished

def wait_for_codebuild_completion(build_id):
    buildStatus = "IN_PROGRESS"
    while buildStatus == "IN_PROGRESS":
        print("Waiting 30s for CodeBuild job to finish...")
        time.sleep(30)
        builds = codebuild_client.batch_get_builds(ids=[build_id])
        print(builds)
        buildStatus = builds['builds'][0]['buildStatus']
    return buildStatus


# helper functon to regularly poll Amplify backend deletion status until finished

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


# Lambda handler

def handler(event, context):
    print("Function invoked with following parameters: ", event, context )
    if event['RequestType'] == 'Create':
        try:
            build = codebuild_client.start_build(projectName = amplify_deploy_project)
            print("Amplify deployment on CodeBuild project successfully started.")
            status = wait_for_codebuild_completion(build['build']['id'])
            if status == "SUCCEEDED":
                print("Amplify deployment successfully finished.")
                cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
            else:
                print("Amplify deployment on CodeBuild project failed executing: ", status)
                cfnresponse.send(event, context, cfnresponse.FAILED, {}, None, status)
        except Exception as e:
            print("Error when trying to deploy Amplify app: ", e)
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {})

    elif event['RequestType'] == 'Delete':
        success = True

        # delete Amplify backend stacks
        try:
            backend = amplify_client.get_backend_environment(appId = app_id, environmentName = env)
            stack_name = backend["backendEnvironment"]["stackName"]
            cloudformation_client.delete_stack(StackName = stack_name, RoleARN = delete_role_arn)

            print("Amplify backend stack deletion successfully started.")
            status = wait_for_amplify_backend_deletion(stack_name)

            if status == "DELETE_COMPLETE":
                print("Amplify backend stack successfully deleted.")
            else:
                print("Amplify backend stack failed deletion: ", status)
                success = False
        except botocore.exceptions.NotFoundException as e:
            print("Could not find any Amplify backend stacks, skipping deletion: ", e)
        except Exception as e:
            print("Error when trying to delete Amplify backend stacks: ", e)
            success = False

        # send final response to CloudFormation
        if success:
            print("Cleanup successfully finished.")
            cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
        else:
            print("Finally failing function execution, see Amplify error in log file above.")
            cfnresponse.send(event, context, cfnresponse.FAILED, {}, event['PhysicalResourceId'], str(e))

    else:
        print(f"RequestType {event['RequestType']} will be ignored.")
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
