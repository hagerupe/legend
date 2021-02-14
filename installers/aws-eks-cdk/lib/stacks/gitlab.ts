import {Stack, StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks'
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import {MongoChart} from "../charts/mongo-chart";
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {GitlabCeChart} from "../charts/gitlab-ce-chart";

export interface GitlabStackProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class GitlabStack extends Stack {
    constructor(scope: cdk.Construct, id: string, props: GitlabStackProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", {
            clusterName: props.clusterName,
            kubectlRoleArn: props.kubectlRoleArn
        })

        cluster.addCdk8sChart("GitlabCE", new GitlabCeChart(new cdk8s.App(), "GitlabCEChart", { }))
    }
}