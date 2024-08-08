# Input parameters:
# - bucket: S3 bucket for build artifacts (CloudFormation needs permission to access files in this bucket)
# - profile: (optional) Name of AWS CLI credential profile to use for S3 artifact upload 
# - email: (only for "deploy") Email address of initial admin user to be auto-created 
# - github_token: (only for "build") Token that will be used to host sandbox-account code (this token must have admin privileges on your github account)
# - github_owner: (only for "deploy") Github username/organization where the repo will be created
# - github_reponame: (only for "deploy") (optional) Name of the repo that will be created
#
# command syntax: 
#   make build bucket=[myDeploymentBucket]
#   make build bucket=[myDeploymentBucket] profile=[myAwsProfile] branch=[currentDevelopmentBranch] github_token=[your_token] 
#   make deploy bucket=[myDeploymentBucket] email=[myAdminEmailAddress] github_owner=[your_github_username]
#   make deploy bucket=[myDeploymentBucket] email=[myAdminEmailAddress] profile=[myAwsProfile]

# check if "bucket" parameter is set, otherwise cancel script execution
ifndef bucket
$(error Missing command line parameter 'bucket=[bucket_name]')
endif

# check if "region" parameter is set, otherwise set region to "us-east-1" as default
ifndef region
region=us-east-1
$(info Parameter 'region' has not been set, defaulting to region 'us-east-1'.)
endif

# add profile string when parameter profile has been set
ifdef profile
profileString=--profile $(profile)
endif

# check if "branch" parameter is set for local development, otherwise set branch to "main" as default 
ifndef branch
branch=main
$(info Parameter 'branch' has not been set, defaulting to branch 'main'.)
endif

# avoid interferences between "build" folder and "build" command, clear build history
.PHONY: all build clean
.SILENT:

build: 
# create "build-cfn" folder if it doesn't exist and empty it
	mkdir -p build-cfn
	rm -f build-cfn/*

# create build artifacts (= zip files) for CloudFormation deployment
	zip -FSr build-cfn/sandbox-accounts-for-events.zip . -x amplify/#current-cloud-backend/\* build/\* build-cfn/\* \*dist/\* \*.DS_Store\* \*.vscode/\* \*.git/\* src/aws-exports.json\* \*amplify-meta.json\* amplify/team-provider-info.json\* \*awscloudformation\* \*node_modules\* amplify/.config/local-\*
	cd install/cfn-lambda/dceHandleTerraFormDeployment && zip -FSr ../../../build-cfn/sandbox-accounts-for-events-lambda-terraform.zip . && cd -
	cd install/cfn-lambda/dceHandleAmplifyDeployment && zip -FSr ../../../build-cfn/sandbox-accounts-for-events-lambda-amplify.zip . && cd -

# create secret that will be used to create github repo
	if [ -z "$(github_token)" ]; then \
		echo "*** Missing command line parameter 'github_token=[your_github_token]'.  Stop."; \
	else \
		aws secretsmanager describe-secret --secret-id DCE-Github-Token >/dev/null 2>&1 || (aws secretsmanager create-secret --name DCE-Github-Token --description "GitHub OAuth Token" --secret-string "{\"OauthToken\":\"${github_token}\"}" >/dev/null 2>&1 && echo "Secret created successfully.") \
	fi

# upload build artifacts and CloudFormation template to specified S3 bucket
	aws s3 sync build-cfn s3://$(bucket) $(profileString)
	aws s3 cp install/sandbox-accounts-for-events-install.yaml s3://$(bucket)/sandbox-accounts-for-events-install.yaml $(profileString)


deploy: 
# check if "email" parameter has bet set, else cancel script execution
	if [ -z "$(email)" ]; then \
		echo "*** Missing command line parameter 'email=[admin_email_address]'.  Stop."; \
	elif [ -z "$(github_owner)" ]; then \
		echo "*** Missing command line parameter 'github_owner=[your_github_username>]'.  Stop."; \
	else \
		aws cloudformation create-stack \
		--stack-name Sandbox-Accounts-for-Events \
		--template-url https://$(bucket).s3.amazonaws.com/sandbox-accounts-for-events-install.yaml \
		--parameters ParameterKey=AdminUserEmailInput,ParameterValue=$(email) \
		             ParameterKey=RepositoryBucket,ParameterValue=$(bucket) \
					 ParameterKey=GitHubOwner,ParameterValue=$(github_owner) \
					 ParameterKey=GitHubRepoName,ParameterValue=$(github_reponame) \
		--capabilities CAPABILITY_IAM $(profileString) \
		--region $(region); \
	fi

delete: 
	aws cloudformation delete-stack \
	--stack-name Sandbox-Accounts-for-Events $(profileString) \
	--region $(region)

create-bucket:
	aws s3 mb s3://$(bucket) --region $(region) $(profileString)

delete-bucket:
	aws s3 rb s3://$(bucket) --region $(region) $(profileString) --force

