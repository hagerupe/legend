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

export interface GitlabStackProps extends StackProps{
    clusterName: string
    kubectlRoleArn: string
}

export class GitlabStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: GitlabStackProps) {
        super(scope, id, props);

        // TODO get from parameter store
        const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
            hostedZoneId: 'Z03966132F39A227RN4A4',
            zoneName: 'sky-hagere.io'
        })
        const certificate = new certificatemanager.DnsValidatedCertificate(this, "GitlabCert", {
            hostedZone: hostedZone,
            domainName: 'gitlab.sky-hagere.io',
        });

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        const artifactImageId = new ArtifactImageId(this, 'ArtifactImageId', {
            artifactBucketName: this.gitlabArtifactBucketName.value.toString(),
            artifactObjectKey: this.gitlabArtifactObjectKey.value.toString(),
        }).response;
        const gitlabPassword = new secretsmanager.Secret(this, "GitlabRootPassword");
        // TODO use external secrets reference CRDS in K8
        const resolveSecret = new ResolveSecret(this, "ResolvedGitlabPassword", { secret: gitlabPassword })
        cluster.addCdk8sChart("GitlabCE", new GitlabCeChart(new cdk8s.App(), "GitlabCEChart", {
            gitlabExternalUrl: 'gitlab.legend.com',
            gitlabRootPassword: resolveSecret.response,
            image: artifactImageId
        }))
    }
}