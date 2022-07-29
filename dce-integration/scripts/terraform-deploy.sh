#!/bin/bash
terraform init
terraform apply -var-file dce.tfvars -auto-approve

if [ "$?" -eq 0 ]
then 
    zip -r terraform.state.zip *
    aws s3 cp terraform.state.zip s3://$TERRAFORM_BUCKET/
    terraform output -json > terraform.output
    aws s3 cp terraform.output s3://$TERRAFORM_BUCKET/
else
    zip -r terraform.state.zip *
    aws s3 cp terraform.state.zip s3://$TERRAFORM_BUCKET/
    terraform destroy -auto-approve -var-file dce.tfvars
fi
