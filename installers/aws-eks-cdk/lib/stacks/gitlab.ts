import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import * as certificatemanager from "@aws-cdk/aws-certificatemanager"
import * as route53 from "@aws-cdk/aws-route53"
import {GitlabCeChart} from "../charts/gitlab-ce-chart";
import {ArtifactImageId} from "../constructs/artifact-image-id";
import {LegendApplicationStack} from "./legend-application-stack";
import {ResolveSecret} from "../constructs/resolve-secret";
import * as ssm from "@aws-cdk/aws-ssm";

export interface GitlabStackProps extends StackProps{
    clusterName: string
    kubectlRoleArn: string
}

export class GitlabStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: GitlabStackProps) {
        super(scope, id, props);

        const legendZoneName = ssm.StringParameter.valueForStringParameter(
            this, 'legend-zone-name');
        const legendHostedZoneId = ssm.StringParameter.valueForStringParameter(
            this, 'legend-hosted-zone-id');

        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
            zoneName: legendZoneName,
            hostedZoneId: legendHostedZoneId,
        })
        const certificate = new certificatemanager.DnsValidatedCertificate(this, "GitlabCert", {
            hostedZone: hostedZone,
            domainName: `gitlab.${legendZoneName}`,
        });

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        const artifactImageId = new ArtifactImageId(this, 'ArtifactImageId', {
            artifactBucketName: this.gitlabArtifactBucketName.value.toString(),
            artifactObjectKey: this.gitlabArtifactObjectKey.value.toString(),
        }).response;
        const gitlabPassword = new secretsmanager.Secret(this, "GitlabRootPassword");
        const resolveSecret = new ResolveSecret(this, "ResolvedGitlabPassword", { secret: gitlabPassword })
        cluster.addCdk8sChart("GitlabCE", new GitlabCeChart(new cdk8s.App(), "GitlabCEChart", {
            gitlabExternalUrl: `gitlab.${legendZoneName}`,
            gitlabRootPassword: resolveSecret.response,
            image: artifactImageId,
            legendDomain: legendZoneName,
        }))
    }
}