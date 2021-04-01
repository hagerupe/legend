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
import {
    engineUrl,
    gitlabRootPasswordFromSecret,
    gitlabUrl,
    mongoPassword,
    resolveConfig,
    sdlcUrl,
    studioDomain
} from "../utils";

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

        const legendZoneName = ssm.StringParameter.valueForStringParameter(this, 'legend-zone-name');

        const gitlabSecretRef = Secret.fromSecretNameV2(this, "GitlabSecretRef", props.gitlabRootSecret.secretName);

        // Generate a OAuth Application
        const config = new GitlabAppConfig(this, "GitlabAppConfig", {
            secret: gitlabRootPasswordFromSecret(this, gitlabSecretRef),
            host: `https://gitlab.${props.stage.prefix}${legendZoneName}`,
            stage: props.stage})

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        cluster.addCdk8sChart("Studio", new LegendStudioChart(new cdk8s.App(), "LegendStudio", {
            imageId: resolveConfig(this, 'Images.LegendStudio'),
            mongoUser: 'admin',
            mongoPassword: mongoPassword(this, props.mongoSecret),
            mongoHostPort: 'mongo-service.default.svc.cluster.local',
            gitlabOauthClientId: config.applicationId,
            gitlabOauthSecret: config.secret,
            legendStudioPort: 80,
            gitlabPublicUrl: gitlabUrl(this, props.stage),
            legendEngineUrl: engineUrl(this, props.stage),
            legendSdlcUrl: sdlcUrl(this, props.stage),
            legendStudioHost: studioDomain(this, props.stage),
        }))
    }
}