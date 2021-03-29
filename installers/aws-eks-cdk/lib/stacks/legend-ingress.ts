import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendApplicationStack} from "./legend-application-stack";
import * as ssm from "@aws-cdk/aws-ssm";
import {LegendIngressChart} from "../charts/legend-ingress-chart";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";

export interface LegendIngressStackProps extends StackProps{
    readonly clusterName: string,
    readonly kubectlRoleArn: string
    readonly stage: LegendInfrastructureStageProps
}

export class LegendIngressStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: LegendIngressStackProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        const legendZoneName = ssm.StringParameter.valueForStringParameter(this, 'legend-zone-name');

        cluster.addCdk8sChart("LegendIngressChart", new LegendIngressChart(new cdk8s.App(), "LegendIngress", {
            legendDomain: legendZoneName,
            stage: props.stage,
        }))
    }
}