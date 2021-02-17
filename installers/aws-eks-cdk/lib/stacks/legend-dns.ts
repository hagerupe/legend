import {StackProps} from '@aws-cdk/core';
import * as cdk from "@aws-cdk/core";
import * as alb from "@aws-cdk/aws-elasticloadbalancingv2";
import * as r53 from "@aws-cdk/aws-route53";
import * as alias from "@aws-cdk/aws-route53-targets";
import {LegendApplicationStack} from "./legend-application-stack";
import * as ssm from "@aws-cdk/aws-ssm";
import * as route53 from "@aws-cdk/aws-route53";

export interface LegendDnsStackProps extends StackProps{
    clusterName: string,
}

// TODO FIXME: can't use built in lookup function as it doesn't work with tokens
export class LegendDnsStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: LegendDnsStackProps) {
        super(scope, id, props);

        const gitlabLoadBalancer = alb.ApplicationLoadBalancer.fromLookup(this, "GitlabLoadBalancer", {
            loadBalancerTags: {
                'ingress.k8s.aws/stack': 'default/gitlab-ingress',
                'elbv2.k8s.aws/cluster': props.clusterName,
            },
        })

        const legendLoadBalancer = alb.ApplicationLoadBalancer.fromLookup(this, "GitlabLoadBalancer", {
            loadBalancerTags: {
                'ingress.k8s.aws/stack': 'default/legend-ingress',
                'elbv2.k8s.aws/cluster': props.clusterName,
            },
        })

        const legendZoneName = ssm.StringParameter.valueForStringParameter(this, 'legend-zone-name');
        const legendHostedZoneId = ssm.StringParameter.valueForStringParameter(this, 'legend-hosted-zone-id');
        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
            zoneName: legendZoneName, hostedZoneId: legendHostedZoneId, })

        new r53.ARecord(this, "GitlabRecordAlias", {
            recordName: `gitlab.${legendZoneName}`,
            target: r53.RecordTarget.fromAlias(new alias.LoadBalancerTarget(gitlabLoadBalancer)),
            zone: hostedZone
        })

        new r53.ARecord(this, "SDLCRecordAlias", {
            recordName: `sdlc.${legendZoneName}`,
            target: r53.RecordTarget.fromAlias(new alias.LoadBalancerTarget(legendLoadBalancer)),
            zone: hostedZone
        })

        new r53.ARecord(this, "EngineRecordAlias", {
            recordName: `engine.${legendZoneName}`,
            target: r53.RecordTarget.fromAlias(new alias.LoadBalancerTarget(legendLoadBalancer)),
            zone: hostedZone
        })

        new r53.ARecord(this, "StudioRecordAlias", {
            recordName: `${legendZoneName}`,
            target: r53.RecordTarget.fromAlias(new alias.LoadBalancerTarget(legendLoadBalancer)),
            zone: hostedZone
        })
    }
}