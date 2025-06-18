> **IMPORTANT NOTE**
>
> In May 2025, AWS has published a new solution called [Innovation Sandbox on AWS](https://docs.aws.amazon.com/solutions/latest/innovation-sandbox-on-aws), covering most of the functionality of this project in a more robust and enterprise-grade way. It also includes additional features, such as lease approvals and lease templates.
> If you are looking for a way how to provide multiple AWS Sandbox Accounts to your internal teams or long-term classes, [Innovation Sandbox on AWS](https://docs.aws.amazon.com/solutions/latest/innovation-sandbox-on-aws) is likely the better and more future-proof way going forward.
> If you are looking for a way to provide multiple AWS Sandbox Accounts quickly to a number of previously unknown users (like one-day workshops with external attendees) who can quickly sign up and sign in, the "Innovation Sandbox on AWS" might not be the best choice (yet), as authenticaion is possible via IAM Identity Center only. For these case, this "Sandbox Accounts for Events" project should be a better fit at this point in time.

# Sandbox Accounts for Events

_Sandbox Accounts for Events_ allows to provide multiple, temporary AWS accounts to a number of authenticated users simultaneously via a browser-based GUI. It uses the concept of "leases" to create temporary access tickets and allows to define expiration periods as well as maximum budget spend per leased AWS account.

Common use cases for _Sandbox Accounts for Events_ include:

-   Providing playground accounts for hands-on learning events like workshops, Immersion Days, etc.
-   Providing sandbox accounts for hackathon events
-   Providing experimentation accounts for developer teams and R&D departments

## Components

Behind the scenes, _Sandbox Accounts for Events_ uses Optum's [Disposable Cloud Environment<sup>TM</sup> (DCE)](https://dce.readthedocs.io/en/latest/home.html) project as backend to register AWS account pools, monitor and manage access and usage as well cleaning up the AWS accounts with AWS Nuke after expiration. Additionally, _Sandbox Accounts for Events_ deploys an AWS Amplify-based React webapp as frontend.

```
├── Frontend
│   └── AWS Amplify webapp                  <-- The core of this project
└── Backend
    ├── AWS Amplify backend                 <-- Some resources to support AWS Amplify webapp
    └── Disposable Cloud Environment (TM)   <-- DCE project cloned from GitHub on deployment
        └── AWS Nuke                        <-- Integrated fork in DCE project
```

## AWS Account structure recommendation

Although it is not required to set up [AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html), we highly recommend you to do so. AWS Organizations allow you to group AWS accounts into organizational units and to apply permission boundaries called "Service Control Policies" (SCPs) to these organizations units. Using SCPs provides a easy and effective way to limit permitted user actions to specific AWS regions and AWS services.

If creating/using an AWS Organizations is no option, you can also set up _Sandbox Accounts for Events_ in a "flat" AWS account structure.

See chapter [Children Accounts](docs/accounts.md) to learn about both options and understand how to deploy them.

# Installing Sandbox Accounts for Events

Prerequisites:

-   An AWS account, preferably part of AWS Organizations (see recommendations in chapter [Children Accounts](docs/accounts.md))
-   AWS CLI v2 installed
-   GNU make installed

1. Clone this GitHub repository to your local environment:

    ```bash
    git clone https://github.com/awslabs/sandbox-accounts-for-events.git
    cd sandbox-accounts-for-events
    ```

1. Review if you want to add any content or change configuration values in the following files:

    - `dce-integration/modules/dce.tfvars`
    - `dce-integration/cmd/codebuild/reset/default-config-nuke-template.yml` (If you use SSO andControltower, use [filter-presets](https://github.com/rebuy-de/aws-nuke#filter-presets) with this [example](https://github.com/rebuy-de/aws-nuke/issues/711#issuecomment-1170365123).)
    - `dce-integration/cmd/codebuild/reset/pre-cleanup.sh`
    - `dce-integration/cmd/codebuild/reset/fix-cleanup.sh`
    - `dce-integration/cmd/codebuild/reset/post-cleanup.sh`
    - `src/pages/components/termsAndConditionsText.js`
    - `dce-integration/modules/fixtures/policies/principal_policy.tmpl`

1. Create an S3 bucket with a unique name to hold the _Sandbox Accounts for Events_ deployment artifacts. Note down the name of the new S3 bucket:

    ```bash
    make create-bucket bucket=[your_deployment_bucket_name]
    ```

1. Build project and upload to newly created S3 bucket:

    ```bash
    make build bucket=[your_deployment_bucket_name]
    ```

1. Deploy the project into your AWS account. You have to specify the email address of an initial admin user for _Sandbox Accounts for Events_:

    ```bash
    make deploy bucket=[your_deployment_bucket_name] email=[email_address_of_admin_user]
    ```

    The CloudFormation script will now start to create the _Sandbox Accounts for Events_ resources in your account, this deployment typically takes about
    25-30 minutes. It will also generate an initial admin user and send a registration email to the email address you specified in step 5.

1. Go to the CloudFormation page your AWS Console and wait until the stack "Sandbox-Accounts-for-Events" is deployed successfully. Choose this stack, switch to the "Outputs" tab and follow the link right to "AmplifyDomainOutput" to open the _Sandbox Accounts for Events_ frontend in your browser. Log in with the email address you provided in step 5 and the one-time password you received via email.

1. By default, _Sandbox Accounts for Events_ will create the AWS Amplify application at URL https://main.xxxxxxxxxxxxxx.amplifyapp.com/. If you want to give it a more friendly domain name, follow the steps in [Set up custom domains for AWS Amplify projects](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html)

**Remark:** By default, _Sandbox Accounts for Events_ is deployed to us-east-1. If you want to use another AWS region, you will need to:

1.  Adjust the file `/dce-integration/modules/dce.tfvars` to the desired region for deployment (parameter name `aws_region`). Also adjust the sandbox account region(s) (parameter name `allowed_regions`), i.e. the AWS regions that sandbox users are allowed to use.

1.  _Optional, but recommended:_ Adjust the `/dce-integration/cmd/codebuild/reset/post-cleanup.sh` script to create default VPCs in the region(s) that AWS Nuke will clean up after usage. Otherwise the accounts will not contain a default VPC after cleanup.

1.  Execute the `make` commands described above with the additional parameter `region=[insert_desired_region_here]`, e.g. `make build bucket=[your_deployment_bucket_name] region=[insert_desired_region_here]`

## Deinstalling Sandbox Accounts for Events

1. Delete _Sandbox Accounts for Events_ resources from your AWS account

    ```bash
    make delete
    ```

1. Delete your S3 bucket to delete the deployment artifacts.
    ```bash
    make delete-bucket bucket=[your_deployment_bucket_name]
    ```

## Troubleshooting installation and deinstallation process

_Sandbox Accounts for Events_ consists of multiple components built on different frameworks with different deployment tools. The core DCE<sup>TM</sup> backend is deployed via TerraForm, the GUI is deployed as AWS Amplify project and the overall _Sandbox Accounts for Events_ project is deployed via CloudFormation.
Although all resources are tied into the main CloudFormation script, in rare cases we experience issues on proper deployment rollback or deletion of the main CloudFormation stack.

If you experience CloudFormation error messages stating failed deployment/rollback or failed deletion, please follow these steps to ensure a full cleanup:

1. Identify the S3 bucket holding the TerraForm state:

    ```bash
    aws s3 ls
    ```

    Note the name of the bucket labelled "dce-terraform-state-xxxxxxxx" (with "xxxxxxxx" being a random alphanumeric string)

1. Create and change new to folder. Copy & unzip the TerraForm state to your local environment (make sure to substitute "xxxxxxxx" with your values):

    ```bash
    mkdir dce-terraform
    cd dce-terraform
    aws s3 cp s3://dce-terraform-state-xxxxxxxx/terraform.state.zip .
    unzip terraform.state.zip
    ```

1. Download & unzip TerraForm v1.2.6 to your local environment and initialize it:

    ```bash
    wget https://releases.hashicorp.com/terraform/1.2.6/terraform_1.2.6_linux_amd64.zip
    unzip terraform_1.2.6_linux_amd64.zip
    terraform init
    ```

1. Let TerraForm destroy all resources it tried to provision earlier. When prompted, enter "dce" as namespace for this TerraForm run and "yes" to confirm the deletion of the TerraForm resources. Wait until TerraForm states "Destroy complete":

    ```bash
    terraform destroy
    ```

1. Go to the CloudFormation page your AWS Console. Choose the stack "Sandbox-Accounts-for-Events" (in state DELETE_FAILED) and choose "Delete". Note down the resources that failed deletion, mark them to retain the resources and choose "Delete Stack". The stack should now be deleted successfully.

1. Go to the S3 page in your AWS console and check if all deployment-releated S3 buckets have been deleted properly. If you still find any leftover S3 buckets labelled "amplify-xxxxxx-main-xxxxxx-deployment" or "dce-terraform-state-xxxxxxxx", delete them ("xxxxxx" being a random alphanumeric string).

1. Clean up your local environment:
    ```bash
    cd ..
    rm -r dce-terraform
    ```

# Documentation

Follow the manuals in the "docs" folder to understand how to operate _Sandbox Accounts for Events_.

-   [Concepts](docs/concept.md) - Understanding the core principles of _Sandbox Accounts for Events_
-   [Login to Sandbox Accounts for Events](docs/login.md) - How to create a user account and authenticate
-   [End user documentation](docs/user.md) - End user guide how to log in and lease an AWS account
-   [Operator documentation](docs/operator.md) - Operator guide how to set up & manage events, manage users and provide AWS account leases
-   [Admin documentation](docs/admin.md) - Admin guide how to register and manage AWS account pool
-   [Children Accounts](docs/accounts.md) - How to create and prepare AWS accounts for your account pool
-   [FAQ](docs/FAQ.md) - Answers to commonly asked questions

# Contributing to _Sandbox Accounts for Events_

Interested in contributing to this project? Check out our [Contributor Guidelines](./CONTRIBUTING.md)

# Disclaimer

The sample code; software libraries; command line tools; proofs of concept; templates; or other related technology (including any of the foregoing that are provided by our personnel) is provided to you as AWS Content under the AWS Customer Agreement, or the relevant written agreement between you and AWS (whichever applies). You should not use this AWS Content in your production accounts, or on production or other critical data. You are responsible for testing, securing, and optimizing the AWS Content, such as sample code, as appropriate for production grade use based on your specific quality control practices and standards. Deploying AWS Content may incur AWS charges for creating or using AWS chargeable resources, such as running Amazon EC2 instances or using Amazon S3 storage.

# License

[Apache License v2.0](./LICENSE)

---

Copyright 2022 Amazon.com, Inc. or its affiliates. All Rights Reserved.
