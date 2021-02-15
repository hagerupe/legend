import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import {EksAwsIngressController} from "../constructs/eks-aws-ingress-controller";
import {CfnOutput, StackProps} from "@aws-cdk/core";
import * as ecr from "@aws-cdk/aws-ecr";
import {LegendApplicationStack} from "./legend-application-stack";
import * as fs from "fs";
import * as path from "path";
import * as yaml from 'js-yaml';

export interface KubernetesStackProperties extends StackProps{
  repositoryNames: string[];
}

export class KubernetesStack extends LegendApplicationStack {

  readonly clusterName: CfnOutput;
  readonly kubectlRoleArn: CfnOutput;
  readonly clusterRole: iam.Role;

  constructor(scope: cdk.Construct, id: string, props: KubernetesStackProperties) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc');

    this.clusterRole = new iam.Role(this, "LegendClusterRole", {
      assumedBy: new iam.ServicePrincipal("eks"),
      managedPolicies: [iam.ManagedPolicy.fromManagedPolicyArn(this, "AmazonEKSClusterPolicy", "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"),
                        iam.ManagedPolicy.fromManagedPolicyArn(this, "CloudWatchAgentServerPolicy", "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy")]
    })

    // Grant EKS permissions to image repositories
    for (let repositoryName of props.repositoryNames) {
      const repository = ecr.Repository.fromRepositoryName(this, repositoryName, repositoryName)
      repository.grantPull(this.clusterRole)
    }

    const eksCluster = new eks.FargateCluster(this, "LegendCluster", {
      role: this.clusterRole,
      vpc: vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE }],
      version: eks.KubernetesVersion.V1_18,
      placeClusterHandlerInVpc: true,

    })
    // TODO parameterize (somewhere) used just for debugging
    eksCluster.awsAuth.addMastersRole(iam.Role.fromRoleArn(this, "SuperAdmin", `arn:aws:iam::${this.account}:role/Administration`))
    eksCluster.awsAuth.addMastersRole(iam.Role.fromRoleArn(this, "SuperAdminSky", `arn:aws:iam::${this.account}:role/skylab-hagere`))

    // Manages ALB and NLB resources for K8 'Services'
    new EksAwsIngressController(this, "IngressController", {
      cluster: eksCluster,
      vpc: vpc
    })

    // Container Insights
    // TODO: [ERROR] Exception: b'error: error validating "/tmp/manifest.yaml": error validating data: invalid object to validate; if you choose to ignore these errors, turn validation off with --validate=false\n' Traceback (most recent call last):   File "/var/task/index.py", line 14, in handler     return apply_handler(event, context)   File "/var/task/apply/__init__.py", line 60, in apply_handler
    // kubectl('create', manifest_file, *kubectl_opts)   File "/var/task/apply/__init__.py", line 87, in kubectl     raise Exception(output)
    /*const containerInsightsManaifestRaw = fs.readFileSync(path.join('resources', 'container-insights.yaml'), {encoding: 'utf8'})
        .replace("{{cluster_name}}", eksCluster.clusterName)
        .replace("{{region_name}}", this.region)
        .replace("{{http_server_toggle}}", "On")
        .replace("{{http_server_port}}", "200")
        .replace("{{read_from_head}}", "Off")
        .replace("{{read_from_tail}}", "On")
    eksCluster.addManifest("ContainerInsights", yaml.loadAll(containerInsightsManaifestRaw))*/

    this.clusterName = new CfnOutput(this, 'ClusterName', { value: eksCluster.clusterName })
    if (eksCluster.kubectlRole !== undefined) {
      this.kubectlRoleArn = new CfnOutput(this, 'kubectlRoleArn', {value: eksCluster.kubectlRole?.roleArn})
    }
  }
}
