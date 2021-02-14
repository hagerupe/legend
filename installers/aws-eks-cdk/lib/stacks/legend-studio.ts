import {Stack, StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks'
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import {MongoChart} from "../charts/mongo-chart";
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendEngineChart} from "../charts/legend-engine";
import {LegendSdlcChart} from "../charts/legend-sdlc";
import {LegendStudioChart} from "../charts/legend-studio";

export interface LegendStudioProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class LegendStudioStack extends Stack {
    constructor(scope: cdk.Construct, id: string, props: LegendStudioProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", {
            clusterName: props.clusterName,
            kubectlRoleArn: props.kubectlRoleArn
        })

        cluster.addCdk8sChart("Engine", new LegendStudioChart(new cdk8s.App(), "LegendSdlc", {

        }))
    }
}