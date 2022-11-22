# Children Accounts

*Sandbox Accounts for Events* is a solution to **manage** AWS accounts, but not to create or delete/close them. To be able to add AWS accounts to your account pool (see chapter [Admin documentation](admin.md) on how to register accounts), you need to prepare these upfront.

But before we start, let's spend a few minutes to understand the possible architectures.

# AWS Account architecture options

## Recommended: Using AWS Organizations

Although it is not required to set up [AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html), we highly recommend you to do so. AWS Organizations allow you to group AWS accounts into organizational units and to apply permission boundaries called "Service Control Policies" (SCPs) to these organizations units. Using SCPs provides a easy and effective way to limit permitted user actions to specific AWS regions and AWS services.

In case you already have existing AWS Organizations established, there is no need to create a second AWS Organization. Just make sure you create a dedicated OU for your children accounts to be able to easily apply SCPs on top of it.

### Creating and managing AWS accounts in AWS Organizations

If you have never used it before, familiarize yourself with [AWS Organizations](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_getting-started_concepts.html), including [Organizational Units (OUs)](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_ous.html), [AWS account management](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts.html) and [Service Control Policies](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html).

We recommend to build the following structure:

```
└── Root
    ├── Management Account                          <-- AWS Organizations Management Account
    ├── ...                                         <-- other OUs and/or accounts...
    └── Organizational Unit: "Sandbox Accounts"     <-- OU to infrastructure related to Sandbox Accounts for Events
        ├── Master account                          <-- Deploy Sandbox Accounts for Events into this account
        └── Organizational Unit: "Children"         <-- OU to hold your pool of accounts
            ├── Child 1
            ├── Child 2                             <-- Children accounts that can be leased
            └──...
```

Note that even that you have organized the Children accounts in a substructure, they still need to bo registered with *Sandbox Accounts for Events*. See chapter "Preparing AWS accounts" below to learn how to prepare and add them to the pool.

### Using Service Control Policies (SCPs) in AWS Organizations to limit user permissions

SCPs are a great centralized way to apply permission boundaries to a set of accounts. We recommend creating an SCP specifically for the children accounts and limit the permissions to specific AWS regions (Sandbox Accounts for Events defaults to "use-east1-" and "us-west-2", more details below) and a subset of AWS services that AWS Nuke can successfully clean up automatically.  

You can find a recommended SCP policy in the "template" folder of this project: [children-scp.json](../templates/children-scp.json)

## Alternative: Flat architecture without hierarchy

As mentioned, *Sandbox Accounts for Events* does not rely on any account hierarchy to be in place. Any AWS account can be added to the account pool, as long as the backend can successfully assume a role there with "AdministratorAccess" policy attached.  
Choose this solution if you are not able to set up a new or use an existing AWS Organization for your purposes.

Keep in mind that in this case you will not be able to apply centrally managed AWS Service Control Policies (SCPs) to your account pool, so you need to limit permissions via the principal role policy template.

### Using the Principal Policy Template with IAM to limit user permissions

In this case the user permissions are limited by the Principal Policy Template, which is applied to each user when claiming a lease and logging into an AWS account.

**By default, *Sandbox Accounts for Events* is pre-configured for a deployment within AWS Organizations as described in the chapters above. To avoid conflicts between SCPs and the Principal Policy Template, the default Principal Policy Template does not sufficiently limit resources without an SCP being in place. Make sure to overwrite the default policy of this project in _/dce-integration/modules/fixtures/policies/principal_policy.tmpl_**

You can find a recommended Principal Policy config for a "flat" account architecture in the "template" folder of this project: [principal_policy.tmpl](../templates/principal_policy.tmpl)

# Preparing children accounts

Any AWS account needs to fulfill two requirements to be added to the account pool:

* [Create an IAM role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-custom.html) in each of your children accounts and attach the managed IAM policy "AdministratorAccess" to it. Make sure to give it an identical role name if you want to add all AWS accounts in one batch (default role name is "DCEAdmin").

* [Add a trust policy](https://aws.amazon.com/blogs/security/how-to-use-trust-policies-with-iam-roles/) to the role, allowing the master account to assume this role.  
    The IAM trust policy should look like:
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "AWS": "arn:aws:iam::XXXXXXXXXXXX:root"
                },
                "Action": "sts:AssumeRole",
                "Condition": {}
            }
        ]
    }
    ```  
    Substitute the "XXXXXXXXXXXX" part with the AWS account ID of your **master account** (where you have deployed Sandbox Accounts for Events), **not** the AWS account ID of your children accounts. If you open the "Register account(s)" dialog in the Sandbox Accounts for Events "Manage acounts" webpage, you can directly copy & paste the correct IAM trust policy from there.

Advanced AWS users working with AWS Organizations may also want to look into [CloudFormation StackSets](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-concepts.html) to deploy an IAM role into multiple accounts simultaneously.

# Children account cleanup

The account cleanup (when an AWS Account is registered to the account pool or returned from a terminated lease) is performed by the Open Source tool [AWS Nuke](https://github.com/rebuy-de/aws-nuke). AWS Nuke scans the AWS account for any resources and deletes it. After successful deletion the account is returned to the account pool for future use.  
DCE creates an AWS CodeBuild project that is executed regularly (default: every 60mins) in the Master account to execute AWS Nuke processes. Check the logs of the CodeBuild executions if an AWS account fails to return back to "Ready" state after some time.

![Cleanup process diagram](images/cleanup-process.png)

Note that AWS Nuke is a third party Open Source tool, not an AWS project. AWS Nuke cannot reliably delete all resources, therefore we highly recommend using SCPs or Principal Policy Templates to limit user permissions as described in the account architecture service above. These permission limits should only allow services that can reliably be "nuked" to avoid continuing costs after terminating a lease.

To support AWS Nuke in the cleanup process, *Sandbox Accounts for Events* has implemented three additional shell scripts, which are executed before, during and after cleanup. You can find the scripts in the _/dce-integration/cmd/codebuild/reset/_ folder of this project.

### pre-cleanup.sh

This script is executed **before** an AWS Nuke cleanup execution is started. It can be used to clean up known resources which would cause AWS Nuke failing to execute.

### fix-cleanup.sh

This script is execute, when an AWS Nuke cleanup has not executed successfully, e.g. due to remaining resources that AWS Nuke is not able to delete. It can be used to manually delete resources between two executions of AWS Nuke, e.g. to help AWS Nuke resolve deletion dependencies. After the fix-cleanup.sh script has been executed, the account is queued back into the cleanup queue for the next AWS Nuke execution (by default 1 hr later).

### post-cleanup.sh

This script is executed **after** an AWS Nuke execution has successfully terminated and all resources identified by AWS Nuke have been deleted. It can be used to clean up known resources which AWS Nuke cannot identify or to re-create default resources (such as Default VPC and subnets) that AWS has deleted before. After this script has successfully terminated, the AWS account is set to "Ready" state and returned back to the account pool for future leases.

# Changing the default AWS regions for Sandbox Accounts for Events

By default, Sandbox Accounts for Events is deployed in the "us-east-1" region. Additionally, the SCPs, Principal Policies and AWS Nuke are configured to permit and clean user actions in "us-east-1" and "us-west-2" only, following best practices of the majority of publicly available AWS workshops. 

_Note 1: We recommend to limit the allowed AWS regions for your users to a minimum of 1-2 regions only. The more AWS regions you allow, the more regions need to be checked and cleaned by AWS Nuke on each execution, increasing AWS Nuke execution time and costs._
_Note 2: In the interest of a smooth experience for your users, only choose regions where your required AWS services are available._

### Sandbox Accounts for Events deployment region

If you need to change your AWS region, you need to adjust the following resources:

* /Makefile: Either use the command line argument "region=[your_desired_region]" for the make commands, or change the value of "region" to the desired AWS region (default = "us-east-1") directly in the Makefile 
* /dce-integration/modules/dce.tfvars: Change parameter "aws_region" to the desired AWS region (default = "us-east-1")

### Sandbox Accounts for Events region permissions for end users

If you need to change the allowed AWS region(s) for your users, you need to adjust the following resources:

* /dce-integration/modules/dce.tfvars: Change parameter "allowed_regions" to an array of the allowed AWS region(s) (default = "["us-east-1","us-west-2"])
* /dce-integration/cmd/codebuild/reset/post-cleanup.sh: Adjust the "aws ec2 create-default-vpc --profile ..." lines to your desired AWS region(s) (one line per region). Defaults are "aws ec2 create-default-vpc --region us-east-1" and "aws ec2 create-default-vpc --region us-west-2"


