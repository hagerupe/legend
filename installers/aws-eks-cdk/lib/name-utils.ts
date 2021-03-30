import {LegendInfrastructureStageProps} from "./legend-infrastructure-stage";
import * as ssm from "@aws-cdk/aws-ssm";
import {Construct} from "@aws-cdk/core";
import * as route53 from "@aws-cdk/aws-route53";

export function hostedZoneName(scope: Construct) {
    return ssm.StringParameter.valueForStringParameter(
        scope, 'legend-zone-name');
}

export function hostedZoneId(scope: Construct) {
    return ssm.StringParameter.valueForStringParameter(
        scope, 'legend-hosted-zone-id');
}

export function hostedZoneRef(scope: Construct, id: string) {
    return route53.HostedZone.fromHostedZoneAttributes(scope, id, {
        zoneName: hostedZoneName(scope),
        hostedZoneId: hostedZoneId(scope),
    })
}

export function gitlabDomain(scope: Construct, props: LegendInfrastructureStageProps) {
    return `gitlab.${props.prefix}${hostedZoneName(scope)}`
}