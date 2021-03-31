import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendStudioChart} from "../charts/legend-studio";
import {LegendApplicationStack} from "./legend-application-stack";
import {ArtifactImageId} from "../constructs/artifact-image-id";
import {ResolveSecret} from "../constructs/resolve-secret";
import * as ssm from "@aws-cdk/aws-ssm";
import * as route53 from "@aws-cdk/aws-route53";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager";
import {LegendInfrastructureStageProps} from "../legend-infrastructure-stage";
import {ResolveConfig} from "../constructs/resolve-config";
import {Secret} from "@aws-cdk/aws-secretsmanager";
import {GitlabAppConfig} from "../constructs/gitlab-app-config";
import {gitlabRootPasswordFromSecret} from "../name-utils";

export interface LegendStudioProps extends StackProps{
    clusterName: string
    kubectlRoleArn: string
    stage: LegendInfrastructureStageProps
    gitlabRootSecret: Secret
    mongoSecret: Secret
}

export class LegendStudioStack extends LegendApplicationStack {

    constructor(scope: cdk.Construct, id: string, props: LegendStudioProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        const artifactImageId = new ResolveConfig(this, 'ArtifactImageId', {
            artifactBucketName: this.configArtifactBucketName.value.toString(),
            artifactObjectKey: this.configArtifactObjectKey.value.toString(),
            path: 'Images.LegendStudio'
        }).value;

        const legendZoneName = ssm.StringParameter.valueForStringParameter(this, 'legend-zone-name');
        const legendHostedZoneId = ssm.StringParameter.valueForStringParameter(this, 'legend-hosted-zone-id');
        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
            zoneName: legendZoneName, hostedZoneId: legendHostedZoneId, })
        const certificate = new certificatemanager.DnsValidatedCertificate(this, "GitlabCert", {
            hostedZone: hostedZone, domainName: `${props.stage.prefix}${legendZoneName}`, });

        const gitlabSecretRef = Secret.fromSecretNameV2(this, "GitlabSecretRef", props.gitlabRootSecret.secretName);
        const config = new GitlabAppConfig(this, "GitlabAppConfig", {
            secret: gitlabRootPasswordFromSecret(this, gitlabSecretRef),
            host: `https://gitlab.${props.stage.prefix}${legendZoneName}`})


        const mongoSecretRef = Secret.fromSecretNameV2(this, "MongoSecretRef", props.mongoSecret.secretName);
        const mongo = new ResolveSecret(scope, "ResolveMongoPassword", { secret: mongoSecretRef }).response;

        cluster.addCdk8sChart("Studio", new LegendStudioChart(new cdk8s.App(), "LegendStudio", {
            imageId: artifactImageId,
            mongoUser: 'admin',
            mongoPassword: mongo,
            mongoHostPort: 'mongo-service.default.svc.cluster.local',
            gitlabOauthClientId: config.applicationId,
            gitlabOauthSecret: config.secret,
            legendStudioPort: 80,
            gitlabPublicUrl: `https://gitlab.${props.stage.prefix}${legendZoneName}`,
            legendEngineUrl: `https://${props.stage.prefix}${legendZoneName}/engine`,
            legendSdlcUrl: `https://${props.stage.prefix}${legendZoneName}/sdlc`,
            legendStudioHost: `${props.stage.prefix}${legendZoneName}`,
        }))
    }
}