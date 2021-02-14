import {Stack, StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks'
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import {MongoChart} from "../charts/mongo-chart";
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendEngineChart} from "../charts/legend-engine";

export interface LegendEngineProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class LegendEngineStack extends Stack {
    constructor(scope: cdk.Construct, id: string, props: LegendEngineProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", {
            clusterName: props.clusterName,
            kubectlRoleArn: props.kubectlRoleArn
        })

        cluster.addCdk8sChart("Engine", new LegendEngineChart(new cdk8s.App(), "LegendEngine", {

        }))
    }
}