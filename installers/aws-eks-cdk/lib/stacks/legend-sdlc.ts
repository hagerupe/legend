import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendSdlcChart} from "../charts/legend-sdlc";
import {LegendApplicationStack} from "./legend-application-stack";

export interface LegendEngineProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class LegendSdlcStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: LegendEngineProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        cluster.addCdk8sChart("SDLC", new LegendSdlcChart(new cdk8s.App(), "LegendSdlc", {
            
        }))
    }
}