import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import s3 = require('@aws-cdk/aws-s3');
import cdk = require('@aws-cdk/core');
import * as codepipeline from '@aws-cdk/aws-codepipeline'

import fs = require('fs');
import * as path from "path";
import {PermissionsBoundary} from "@aws-cdk/aws-iam";

export interface ArtifactImageIdProps {
    artifact: codepipeline.Artifact
}

export class ArtifactImageId extends cdk.Construct {
    public readonly response: string;

    constructor(scope: cdk.Construct, id: string, props: ArtifactImageIdProps) {
        super(scope, id);

        const lambdaSingleton = new lambda.SingletonFunction(this, 'Singleton', {
            uuid: 'f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc',
            code: new lambda.InlineCode(fs.readFileSync(path.join('resources', 'handlers', 'artifactImageId', 'index.py'), { encoding: 'utf-8' })),
            handler: 'index.main',
            timeout: cdk.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_3_6,
        })

        const artifactBucket = s3.Bucket.fromBucketAttributes(this, "ArtifactBucket", props.artifact)
        artifactBucket.grantRead(lambdaSingleton)

        const resource = new cfn.CustomResource(this, 'Resource', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                bucket: props.artifact.bucketName,
                objectKey: props.artifact.objectKey,
            }
        });

        this.response = resource.getAtt('Response').toString();
    }
}