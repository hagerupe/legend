# Welcome to your CDK TypeScript project!

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template


cdk bootstrap --profile skylab --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess

aws eks update-kubeconfig --name LegendClusterA6751FE1-66853c12fd444fca92be6b3a8a01a9ca
kubectl logs -n kube-system legendengine-0fc9d131-866cd4c9bd-rbq8m
