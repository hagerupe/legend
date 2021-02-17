import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendEngineChart} from "../charts/legend-engine";
import {LegendApplicationStack} from "./legend-application-stack";
import {ArtifactImageId} from "../constructs/artifact-image-id";
import {ResolveSecret} from "../constructs/resolve-secret";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ssm from "@aws-cdk/aws-ssm";

export interface LegendEngineProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class LegendEngineStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: LegendEngineProps) {
        super(scope, id, props);


        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        const artifactImageId = new ArtifactImageId(this, 'ArtifactImageId', {
            artifactBucketName: this.engineArtifactBucketName.value.toString(),
            artifactObjectKey: this.engineArtifactObjectKey.value.toString(),
        }).response;

        const mongoPassword = new secretsmanager.Secret(this, "MongoPassword");
        const resolveMongoPass = new ResolveSecret(this, "ResolveMongoPassword", { secret: mongoPassword })

        const legendZoneName = ssm.StringParameter.valueForStringParameter(this, 'legend-zone-name');

        cluster.addCdk8sChart("Engine", new LegendEngineChart(new cdk8s.App(), "LegendEngine", {
            imageId: artifactImageId,
            gitlabOauthClientId: 'foo', // TODO
            gitlabOauthSecret: 'foo', // TODO
            gitlabPublicUrl: `https://gitlab.${legendZoneName}`,
            mongoHostPort: 27017,
            mongoUser: 'admin',
            mongoPassword: resolveMongoPass.response,
            legendEnginePort: 80,
        }))
    }
}