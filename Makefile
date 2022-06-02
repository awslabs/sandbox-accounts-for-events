# Input parameters:
# - bucket: S3 bucket for build artifacts (CloudFormation needs permission to access files in this bucket)
# - profile: (optional) Name of AWS CLI credential profile to use for S3 artifact upload 
# - email: (only for "deploy") Email address of initial admin user to be auto-created 
#
# command syntax: 
#   make build bucket=[myDeploymentBucket]
#   make build bucket=[myDeploymentBucket] profile=[myAwsProfile]
#   make deploy bucket=[myDeploymentBucket] email=[myAdminEmailAddress]
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


# avoid interferences between "build" folder and "build" command, clear build history
.PHONY: all build clean
.SILENT:

build: 
# create "build" folder if it doesn't exist and empty it
	mkdir -p build
	rm -f build/*

# create build artifacts (= zip files) for CloudFormation deployment
	git archive --format zip --output build/sandbox-accounts-for-events.zip main
	cd install/cfn-lambda/dceHandleTerraFormDeployment && zip -r ../../../build/sandbox-accounts-for-events-lambda-terraform.zip . && cd -
	cd install/cfn-lambda/dceHandleAmplifyDeployment && zip -r ../../../build/sandbox-accounts-for-events-lambda-amplify.zip . && cd -

# upload build artifacts and CloudFormation template to specified S3 bucket
	aws s3 sync build s3://$(bucket) $(profileString)
	aws s3 cp install/sandbox-accounts-for-events-install.yaml s3://$(bucket)/sandbox-accounts-for-events-install.yaml $(profileString)


deploy: 
# check if "email" parameter has bet set, else cancel script execution
	if [ -z "$(email)" ]; then \
		echo "*** Missing command line parameter 'email=[admin_email_address]'.  Stop."; \
	else \
		aws cloudformation create-stack \
		--stack-name Sandbox-Accounts-for-Events \
		--template-url https://$(bucket).s3.amazonaws.com/sandbox-accounts-for-events-install.yaml \
		--parameters ParameterKey=AdminUserEmailInput,ParameterValue=$(email) \
		             ParameterKey=RepositoryBucket,ParameterValue=$(bucket) \
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

