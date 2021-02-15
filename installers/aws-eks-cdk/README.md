1. **Create AWS account if one is not yet available**

https://portal.aws.amazon.com/billing/signup

1. **Create IAM user**

* Navigate to: https://console.aws.amazon.com/iam/home?region=us-east-1#/users

* Add user and enable 'Programitic Access'

* On the next page attach an existing policy of `AdministratorAccess`

* Create the user and make note of the `access key id` and `secret access key`

1. **Install and configure AWS CLI**

https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html

From the terminal run `aws configure` and set the `access key` and `secret access key` from the IAM user setup.  Set the region to `us-east-1`

Verify by running `aws sts get-caller-identity`, it should return the ARN of the configured user

1. **Install NPM**

1. **Install CDK**

1. **Create github secret**

1. **Create dockerhub secret**

1. **Create Route53 hosted zone for existing / new domain**

1. **Create CDK Bootstrap Environment:**

Execute `cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess`

1. **Synthesize and Deploy Legend Pipeline:** 

`cdk synth && cdk deploy`

1. **Sign into the aws console and navigate to .... this will take a couple hours, because you know, EKS...**

https://console.aws.amazon.com/codesuite/codepipeline/pipelines/Legend/view?region=us-east-1

----

### TODOs:

Make dockerhub secret optional

Setup container insights

Add documentation on running kubectl / installing etc

LegendSDLC build fails

No container for LegendStudio yet?

Make Gitlab durable

Make Mongo durable

Switch mongo LB to be internal instead of external

Dashboards! (Woot)

Health checks?