## Getting Started

1. **Create AWS account if one is not yet available**
    - Refer to: https://portal.aws.amazon.com/billing/signup
1. **Create IAM user**
    - Navigate to: https://console.aws.amazon.com/iam/home?region=us-east-1#/users
    - Add user and enable `Programatic Access`
    - On the next page attach an existing policy of `AdministratorAccess`
    - Create the user and make note of the `access key id` and `secret access key`
1. **Install and configure AWS CLI**
    - Reference: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html
    - From the terminal run `aws configure`
        - Set the `access key` and `secret access key` from the IAM user setup.  
        - Set the region to `us-east-1`
    - Verify by running `aws sts get-caller-identity`, it should return the ARN of the configured user

1. **Install NPM**
    - Refer to: https://nodejs.org/en/download/package-manager/
1. **Install CDK/CDK8S**
    - Execute `npm install cdk cdk8s -g`
1. **Create github secret**
    - The github token allows the pipeline to trigger on new commits.
    - The required permission is `Repo`.  
    - Refer to: https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token
    - Store the access token in secrets manager (replace values): 
    
    `aws secretsmanager create-secret --name github-access-token --secret-string <<access-token>>`

aws secretsmanager create-secret --name github-access-token --secret-string <<access-token>>

1. **Create dockerhub secret**
    - The addresses used by CodeBuild are recycled, as such the anonymous access limits for dockerhub are often encountered during builds.
    - Create an access token, refer to: https://docs.docker.com/docker-hub/access-tokens/
    - Store the access token in secrets manager (replace values):

    `aws secretsmanager create-secret --name dockerhub-credentials --secret-string '{  "Username": "<<username>>", "Password": "<<access-token>>" }'`

aws secretsmanager create-secret --name dockerhub-credentials --secret-string '{  "Username": "<<username>>"," Password": "<<access-token>>" }'

1. **Create Route53 hosted zone for existing / new domain**
    - A domain name may either be registered via Route53, or an existing domains nameservers can be pointed to a new HostedZone.
    - Store the zone name (e.g. foobar.com) in parameter store:
    
    `aws ssm put-parameter --type String --name legend-zone-name --value <<zone-name>>`
    
    `aws ssm put-parameter --type String --name legend-hosted-zone-id --value <<zone-id>>`

1. **Set master role that will be used for viewing cluster details in the AWS console**

    `aws ssm put-parameter --type String --name master-role-access --value skylab-hagere`

1. **Create CDK Bootstrap Environment:**

    - Execute `cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess`

1. **Synthesize and Deploy Legend Pipeline:** 

    - Execute: `cdk synth && cdk deploy`

1. **Monitor Deployment**
    - Navigate to: https://console.aws.amazon.com/codesuite/codepipeline/pipelines/Legend/view?region=us-east-1
    - Setup will take approximately 60 minutes

1. **Setup CNAME for gitlab**

1. **Setup GitLab Access Token**
   - Navigate to `https://gitlab.<<zone-name>>/`
   - Create an application
   - Store in parameter store (replace values):

    `aws ssm put-parameter --type String --name gitlab-client-id --value <<client-id>>`
       
    `aws ssm put-parameter --type String --name gitlab-access-code --value <<access-token>>`

1. **Deploy Remaining Stacks**

1. **Add CNAME records**

## Debug Utilities:

- Setup kubectl for EKS: `aws eks update-kubeconfig --name [cluster_name]`

- https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Legend;expand=true;autoRefresh=60

- `kubectl exec --stdin --tty [pod_name] -- /bin/bash`

- `kubectl describe configmaps [config_map_name]`

- `kubectl rollout restart deployment [deployment_name]`

## TODOs:

LegendSDLC build fails - need to disable docker integ test stuff

LegendStudio build fails - Add profile for legend-studio to disable git commit plugin 

Make Mongo durable

Dashboards! (Woot)

Health checks? Scaling, etc...

Move master kubernetes role to pipeline stack (broken prod provision)

Gitlab oauth app create automation, somehow?

Move secrets to direct kubernetes external secrets instead of secrets manager directly

Automate A record aliases to LB, needs to await for lb to be created by k8