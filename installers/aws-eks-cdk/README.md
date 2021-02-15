
Create AWS account

Create IAM user

Install AWS CLI

aws configure

Install NPM

Install CDK

Create github secret

Create dockerhub secret

Create CDK Bootstrap Environment:

`cdk bootstrap --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess`

Synthesize and Deploy Legend Pipeline: 

`cdk synth && cdk deploy`


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