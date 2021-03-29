import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');

import {Stack} from "@aws-cdk/core";

export interface ResolveConfigProps {
    readonly artifactBucketName: string
    readonly artifactObjectKey: string
    readonly path: string
}

export class ResolveConfig extends cdk.Construct {
    public readonly response: string;

    constructor(scope: cdk.Construct, id: string, props: ResolveConfigProps) {
        super(scope, id);

        const functionArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:ResolveConfig`
        const lambdaSingleton = lambda.Function.fromFunctionAttributes(this, "ResolveConfigFunction", { functionArn: functionArn })

        const resource = new cfn.CustomResource(this, 'Resource', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                bucket: props.artifactBucketName,
                objectKey: props.artifactObjectKey,
                path: props.path,
            }
        });

        this.response = resource.getAtt('Response').toString();
    }
}