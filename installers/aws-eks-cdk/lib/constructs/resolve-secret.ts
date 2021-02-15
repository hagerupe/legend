import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');
import {Stack} from "@aws-cdk/core";
import * as secretmanager from "@aws-cdk/aws-secretsmanager";

export interface ResolveSecretProps {
    secret: secretmanager.Secret
}

export class ResolveSecret extends cdk.Construct {
    public readonly response: string;

    constructor(scope: cdk.Construct, id: string, props: ResolveSecretProps) {
        super(scope, id);

        const functionArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:ResolveSecret`
        const lambdaSingleton = lambda.Function.fromFunctionAttributes(this, "ResolveSecretFunction", { functionArn: functionArn })
        props.secret.grantRead(lambdaSingleton)

        const resource = new cfn.CustomResource(this, 'ResolveSecret', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                secret: props.secret.secretValue,
            }
        });

        this.response = resource.getAtt('Response').toString();
    }
}