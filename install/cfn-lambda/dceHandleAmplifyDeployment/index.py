import boto3
import os
import cfnresponse
import time
import urllib3
import json

github_api_url = "https://api.github.com"
github_repo = os.environ['GITHUB_REPO']
github_branch = os.environ['GITHUB_BRANCH']
github_token = os.environ['GITHUB_TOKEN']
amplify_client = boto3.client('amplify')
amplify_backendclient = boto3.client('amplifybackend')
s3 = boto3.resource('s3')
cloudformation_client = boto3.client('cloudformation')
app_id = os.environ['AMPLIFY_APP_ID']
env = os.environ['AMPLIFY_ENV']
delete_role_arn = os.environ['DELETE_ROLE_ARN']

http = urllib3.PoolManager()

headers = {
    "Authorization": f"token {github_token}",
    "Accept": "application/vnd.github.v3+json"
}

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

def get_amplify_webhook(app_id, branch):
    client = boto3.client('amplify')
    response = client.create_webhook(
        appId=app_id,
        branchName=branch,
        description='Webhook for Amplify branch deployment'
    )
    return response['webhook']['webhookUrl']

def create_github_webhook():
    try:
        # Créer le webhook entrant sur Amplify et obtenir l'URL
        amplify_webhook_url = get_amplify_webhook(app_id, env)

        url = f"https://api.github.com/repos/{github_repo}/hooks"
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        payload = {
            "name": "web",
            "active": True,
            "events": ["push", "pull_request"],
            "config": {
                "url": amplify_webhook_url,
                "content_type": "json",
                "insecure_ssl": "0"
            }
        }

        response = http.request('POST', url, body=json.dumps(payload), headers=headers)
        if response.status >= 400:
            raise Exception(f"Failed to create GitHub webhook: {response.status} {response.data.decode('utf-8')}")

        return {
            "statusCode": response.status,
            "body": response.data.decode('utf-8')
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }

def handler(event, context):
    if event['RequestType'] == 'Create':
        try:
            create_github_webhook()
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