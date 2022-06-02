#!/bin/bash
aws s3 cp s3://$TERRAFORM_BUCKET/terraform.state.zip .
if [ "$?" -eq 0 ]
then 
    unzip terraform.state.zip && 
    terraform init && 
    terraform destroy -auto-approve && 
    aws s3 rm s3://$TERRAFORM_BUCKET/ --recursive
else
    echo "Download of TerraForm state file failed. Assuming automated rollback, so setting this execution to SUCCEEDED."
fi
