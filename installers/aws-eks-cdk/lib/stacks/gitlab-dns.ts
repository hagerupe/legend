import {StackProps} from '@aws-cdk/core';
import * as cdk from "@aws-cdk/core";
import * as route53 from "@aws-cdk/aws-route53"
import * as alias from "@aws-cdk/aws-route53-targets"
import {LegendApplicationStack} from "./legend-application-stack";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import {gitlabDomain, hostedZoneRef} from "../utils";
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';

export interface GitlabDnsStackProps extends StackProps {
    stage: LegendInfrastructureStageProps
}

export class GitlabDnsStack extends LegendApplicationStack {

    constructor(scope: cdk.Construct, id: string, props: GitlabDnsStackProps) {
        super(scope, id, props);

        const loadBalancer = elbv2.ApplicationLoadBalancer.fromLookup(this, 'GitlabLoadBalancer', {
            loadBalancerTags: {
                "ingress.k8s.aws/stack": "default/gitlab-ce-ingress",
                "EnvStage": props.stage.stageName,
            },
        });

        const hostedZone = hostedZoneRef(this, "LegendHostedZone")
        new route53.ARecord(this, 'AliasRecord', {
            zone: hostedZone,
            recordName: gitlabDomain(this, props.stage),
            target: route53.RecordTarget.fromAlias(new alias.LoadBalancerTarget(loadBalancer)),
        });
    }
}