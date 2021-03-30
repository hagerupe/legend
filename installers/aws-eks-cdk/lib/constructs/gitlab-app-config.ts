import cfn = require('@aws-cdk/aws-cloudformation');
import cdk = require('@aws-cdk/core');
import {Stack} from "@aws-cdk/core";
import * as secretmanager from "@aws-cdk/aws-secretsmanager";
import * as lambda from '@aws-cdk/aws-lambda';
import {ManagedPolicy} from "@aws-cdk/aws-iam";
import * as fs from "fs";
import * as path from "path";
import * as iam from "@aws-cdk/aws-iam";

export interface GitlabAppConfigProps {
    readonly secret: secretmanager.ISecret
    readonly host: string
}

export class GitlabAppConfigFunction extends lambda.SingletonFunction {
    constructor(scope: cdk.Construct, id: string, props?: lambda.SingletonFunctionProps) {
        super(scope, id, {
            ...{functionName: 'GitlabAppConfig',
                uuid: '0f1cd18d-01fd-4508-96f0-62f31f4a6140',
                code: new lambda.AssetCode('lib/handlers/gitlabApplicationConfig'),
                handler: 'index.main',
                timeout: cdk.Duration.seconds(300),
                runtime: lambda.Runtime.PYTHON_3_6},
            ...props
        });
        const resolveSecretPolicy = new iam.Policy(this, "ResolveSecretPolicy", {
            document: iam.PolicyDocument.fromJson(JSON.parse(fs.readFileSync(path.join('resources', 'secrets-manager-readonly-policy.json'), {encoding: 'utf8'})))
        })
        if (this.role !== undefined) {
            resolveSecretPolicy.attachToRole(this.role)
        }
    }
}

export class GitlabAppConfig extends cdk.Construct {
    public readonly applicationId: string;
    public readonly secret: string;

    constructor(scope: cdk.Construct, id: string, props: GitlabAppConfigProps) {
        super(scope, id);

        const functionArn = `arn:aws:lambda:${Stack.of(this).region}:${Stack.of(this).account}:function:GitlabAppConfig`
        const lambdaSingleton = lambda.Function.fromFunctionAttributes(this, "GitlabAppConfigFunction", { functionArn: functionArn })
        props.secret.grantRead(lambdaSingleton)

        const resource = new cfn.CustomResource(this, 'GitlabAppConfig', {
            provider: cfn.CustomResourceProvider.lambda(lambdaSingleton),
            properties: {
                Secret: props.secret.secretName,
                Host: props.host,
            }
        });

        this.applicationId = resource.getAtt('applicationId').toString();
        this.secret = resource.getAtt('secret').toString();
    }
}