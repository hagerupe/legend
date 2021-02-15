import {Stack, StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks'
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendStudioChart} from "../charts/legend-studio";

export interface LegendStudioProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class LegendStudioStack extends Stack {
    constructor(scope: cdk.Construct, id: string, props: LegendStudioProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        cluster.addCdk8sChart("Studio", new LegendStudioChart(new cdk8s.App(), "LegendStudio", {

        }))
    }
}