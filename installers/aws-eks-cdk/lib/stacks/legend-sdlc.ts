import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendSdlcChart} from "../charts/legend-sdlc";
import {LegendApplicationStack} from "./legend-application-stack";
import {ArtifactImageId} from "../constructs/artifact-image-id";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import {ResolveSecret} from "../constructs/resolve-secret";
import * as ssm from "@aws-cdk/aws-ssm";

export interface LegendEngineProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class LegendSdlcStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: LegendEngineProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        const artifactImageId = new ArtifactImageId(this, 'ArtifactImageId', {
            artifactBucketName: this.sdlcArtifactBucketName.value.toString(),
            artifactObjectKey: this.sdlcArtifactObjectKey.value.toString(),
        }).response;

        const mongoPassword = new secretsmanager.Secret(this, "MongoPassword");
        const resolveMongoPass = new ResolveSecret(this, "ResolveMongoPassword", { secret: mongoPassword })

        const legendZoneName = ssm.StringParameter.valueForStringParameter(this, 'legend-zone-name');

        cluster.addCdk8sChart("SDLC", new LegendSdlcChart(new cdk8s.App(), "LegendSdlc", {
            imageId: artifactImageId,
            legendSdlcPort: 80,
            gitlabOauthClientId: 'foo', // TODO
            gitlabOauthSecret: 'foo', // TODO
            gitlabPublicUrl: `https://gitlab.${legendZoneName}`,
            mongoHostPort: 27017,
            mongoUser: 'admin',
            mongoPassword: resolveMongoPass.response,
            gitlabHost: `gitlab.${legendZoneName}`,
            gitlabPort: 443,
            legendSdlcUrl: `sdlc.${legendZoneName}`,
        }))
    }
}