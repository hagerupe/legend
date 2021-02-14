import {Stack, StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks'
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {GitlabCeChart} from "../charts/gitlab-ce-chart";
import * as codepipeline from '@aws-cdk/aws-codepipeline'
import { CustomResource } from '@aws-cdk/core';
import * as logs from '@aws-cdk/aws-logs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as cr from '@aws-cdk/custom-resources';
import * as path from "path";
import {MyCustomResource} from "../constructs/artifact-image-id";

export interface GitlabStackProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
    artifact: codepipeline.Artifact
}

export class GitlabStack extends Stack {
    constructor(scope: cdk.Construct, id: string, props: GitlabStackProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", {
            clusterName: props.clusterName,
            kubectlRoleArn: props.kubectlRoleArn
        })

        // TODO clean up
        const resource = new MyCustomResource(this, 'DemoResource', {
            message: 'CustomResource says hello',
        });

        const gitlabPassword = new secretsmanager.Secret(this, "GitlabRootPassword");
        cluster.addCdk8sChart("GitlabCE", new GitlabCeChart(new cdk8s.App(), "GitlabCEChart", {
            gitlabExternalUrl: 'gitlab.legend.com',
            gitlabRootPassword: gitlabPassword.secretValue.toString(),
            image: resource.response
        }))
    }
}