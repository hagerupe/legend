import cfn = require('@aws-cdk/aws-cloudformation');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/core');

import fs = require('fs');
import * as path from "path";

export interface ArtifactImageIdProps {
    bucket: string
    objectKey: string
}

export class ArtifactImageId extends cdk.Construct {
    public readonly response: string;

    constructor(scope: cdk.Construct, id: string, props: ArtifactImageIdProps) {
        super(scope, id);

        const resource = new cfn.CustomResource(this, 'Resource', {
            provider: cfn.CustomResourceProvider.lambda(new lambda.SingletonFunction(this, 'Singleton', {
                uuid: 'f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc',
                code: new lambda.InlineCode(fs.readFileSync(path.join('resources', 'handlers', 'artifactImageId', 'index.py'), { encoding: 'utf-8' })),
                handler: 'index.main',
                timeout: cdk.Duration.seconds(300),
                runtime: lambda.Runtime.PYTHON_3_6,
            })),
            properties: props
        });

        this.response = resource.getAtt('Response').toString();
    }
}