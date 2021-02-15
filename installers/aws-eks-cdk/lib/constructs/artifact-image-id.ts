import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');

import {Stack} from "@aws-cdk/core";

export interface ArtifactImageIdProps {
    artifactBucketName: string
    artifactObjectKey: string
}

export class ArtifactImageId extends cdk.Construct {
    public readonly response: string;

    constructor(scope: cdk.Construct, id: string, props: ArtifactImageIdProps) {
        super(scope, id);

        const functionArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:ArtifactImageId`
        const lambdaSingleton = lambda.Function.fromFunctionAttributes(this, "ArtifactImageIdFunction", { functionArn: functionArn })

        const resource = new cfn.CustomResource(this, 'Resource', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                bucket: props.artifactBucketName,
                objectKey: props.artifactObjectKey,
            }
        });

        this.response = resource.getAtt('Response').toString();
    }
}