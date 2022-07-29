#!/bin/bash
echo "Downloading TerraForm state file from S3 bucket."
aws s3 cp s3://$TERRAFORM_BUCKET/terraform.state.zip .

if [ "$?" -eq 0 ]
then 
    echo "Unzipping TerraForm state file." &&
    unzip terraform.state.zip && 
    echo "Initializing TerraForm run." &&
    terraform init && 
    echo "Destroying TerraForm resources." &&
    terraform destroy -auto-approve -var-file dce.tfvars &&
    echo "Emptying TerraForm state S3 bucket." &&
    aws s3 rm s3://$TERRAFORM_BUCKET --recursive
else
    echo "Download of TerraForm state file failed. Assuming automated rollback, so setting this execution to SUCCEEDED."
fi
