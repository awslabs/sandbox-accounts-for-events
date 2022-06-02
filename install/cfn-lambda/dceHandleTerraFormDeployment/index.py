import boto3
import os
import cfnresponse
import time

codebuild_client = boto3.client('codebuild')
deploy_project = os.environ['DEPLOY_PROJECT']
destroy_project = os.environ['DESTROY_PROJECT']

def wait_for_codebuild_completion(build_id):
    buildStatus = "IN_PROGRESS"
    while buildStatus == "IN_PROGRESS":
        print("Waiting 30s for CodeBuild job to finish...")
        time.sleep(30)
        builds = codebuild_client.batch_get_builds(ids=[build_id])
        print(builds)
        buildStatus = builds['builds'][0]['buildStatus']
    return buildStatus

def handler(event, context):
    if event['RequestType'] == 'Create':
        try:
            build = codebuild_client.start_build(projectName=deploy_project)
            print("CodeBuild 'deploy' project successfully started.")
            status = wait_for_codebuild_completion(build['build']['id'])
            if status == "SUCCEEDED":
                print("CodeBuild 'deploy' project successfully finished.")
                cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
            else:
                print("CodeBuild 'deploy' project failed executing: ", status)
                cfnresponse.send(event, context, cfnresponse.FAILED, {}, None, status)
        except Exception as e:
            print("Error when trying to start deploying: ", e)
            cfnresponse.send(event, context, cfnresponse.FAILED, {}, None, str(e))
    elif event['RequestType'] == 'Delete':
        try:
            print("Checking if CodeBuild 'deploy' project has already finished before we start to destroy it.")
            time.sleep(10)
            deployBuild = codebuild_client.list_builds_for_project(projectName=deploy_project)
            if len(deployBuild['ids']) > 0:
                wait_for_codebuild_completion(deployBuild['ids'][0])
            build = codebuild_client.start_build(projectName=destroy_project)
            print("CodeBuild 'destroy' project successfully started.")
            status = wait_for_codebuild_completion(build['build']['id'])
            if status == "SUCCEEDED":
                print("CodeBuild 'destroy' project successfully finished.")
                cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
            else:
                print("CodeBuild 'destroy' project failed executing: ", status)
                cfnresponse.send(event, context, cfnresponse.FAILED, {}, None, status)
        except Exception as e:
            print("Error when trying to start destroying: ", e)
            cfnresponse.send(event, context, cfnresponse.FAILED, {}, event['PhysicalResourceId'], str(e))
    else:
        print(f"RequestType {event['RequestType']} will be ignored.")
        cfnresponse.send(event, context, cfnresponse.SUCCESS, {})