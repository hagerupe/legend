import {CfnParameter, Stack, StackProps} from '@aws-cdk/core';
import * as cdk from "@aws-cdk/core";

export class LegendApplicationStack extends Stack {

    readonly gitlabArtifactBucketName: CfnParameter
    readonly gitlabArtifactObjectKey: CfnParameter

    readonly engineArtifactBucketName: CfnParameter
    readonly engineArtifactObjectKey: CfnParameter

    constructor(scope: cdk.Construct, id: string, props: StackProps) {
        super(scope, id, props);

        this.gitlabArtifactBucketName = new CfnParameter(this, "GitlabArtifactBucketName");
        this.gitlabArtifactObjectKey = new CfnParameter(this, "GitlabArtifactObjectKey");

        this.engineArtifactBucketName = new CfnParameter(this, "EngineArtifactBucketName");
        this.engineArtifactObjectKey = new CfnParameter(this, "EngineArtifactObjectKey");
    }
}