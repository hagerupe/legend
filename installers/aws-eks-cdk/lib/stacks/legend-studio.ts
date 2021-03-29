import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendStudioChart} from "../charts/legend-studio";
import {LegendApplicationStack} from "./legend-application-stack";
import {ArtifactImageId} from "../constructs/artifact-image-id";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import {ResolveSecret} from "../constructs/resolve-secret";
import * as ssm from "@aws-cdk/aws-ssm";
import * as route53 from "@aws-cdk/aws-route53";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import {ResolveConfig} from "../constructs/resolve-config";

export interface LegendStudioProps extends StackProps{
    clusterName: string
    kubectlRoleArn: string
    stage: LegendInfrastructureStageProps
}

export class LegendStudioStack extends LegendApplicationStack {

    constructor(scope: cdk.Construct, id: string, props: LegendStudioProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        const artifactImageId = new ResolveConfig(this, 'ArtifactImageId', {
            artifactBucketName: this.configArtifactBucketName.value.toString(),
            artifactObjectKey: this.configArtifactObjectKey.value.toString(),
            path: 'Images.LegendStudio'
        }).response;

        const mongoPassword = new secretsmanager.Secret(this, "MongoPassword");
        const resolveMongoPass = new ResolveSecret(this, "ResolveMongoPassword", { secret: mongoPassword })

        const legendZoneName = ssm.StringParameter.valueForStringParameter(this, 'legend-zone-name');
        const legendHostedZoneId = ssm.StringParameter.valueForStringParameter(this, 'legend-hosted-zone-id');
        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
            zoneName: legendZoneName, hostedZoneId: legendHostedZoneId, })
        const certificate = new certificatemanager.DnsValidatedCertificate(this, "GitlabCert", {
            hostedZone: hostedZone, domainName: `${props.stage.prefix}${legendZoneName}`, });

        const gitlabClientId = ssm.StringParameter.valueForStringParameter(this, 'gitlab-client-id');
        const gitlabAccessCode = ssm.StringParameter.valueForStringParameter(this, 'gitlab-access-code');

        cluster.addCdk8sChart("Studio", new LegendStudioChart(new cdk8s.App(), "LegendStudio", {
            imageId: artifactImageId,
            mongoUser: 'admin',
            mongoPassword: resolveMongoPass.response,
            mongoHostPort: 'mongo-service.default.svc.cluster.local',
            gitlabOauthClientId: gitlabClientId,
            gitlabOauthSecret: gitlabAccessCode,
            legendStudioPort: 80,
            gitlabPublicUrl: `https://gitlab.${props.stage.prefix}${legendZoneName}`,
            legendEngineUrl: `https://${props.stage.prefix}${legendZoneName}/engine`,
            legendSdlcUrl: `https://${props.stage.prefix}${legendZoneName}/sdlc`,
            legendStudioHost: `${props.stage.prefix}${legendZoneName}`,
        }))
    }
}