#!/bin/bash
echo "Initializing TerraForm."
terraform init
echo "Deploying TerraForm resources."
terraform apply -var-file dce.tfvars -auto-approve

if [ "$?" -eq 0 ]
then 
    echo "TerraForm deployment succeeded. Zipping state folder."
    zip -r terraform.state.zip *
    echo "Uploading state zip file to TerraFrom state S3 bucket."
    aws s3 cp terraform.state.zip s3://$TERRAFORM_BUCKET/
    echo "Saving TerraForm output parameters to file."
    terraform output -json > terraform.output
    echo "Uploading ZerraForm output file to TerraFrom state S3 bucket."
    aws s3 cp terraform.output s3://$TERRAFORM_BUCKET/
else
    echo "TerraForm deployment failed. Zipping state folder."
    zip -r terraform.state.zip *
    echo "Uploading state zip file to TerraFrom state S3 bucket."
    aws s3 cp terraform.state.zip s3://$TERRAFORM_BUCKET/
    echo "Deleting all potential leftovers of TerraForm resources."
    terraform destroy -auto-approve -var-file dce.tfvars
fi
