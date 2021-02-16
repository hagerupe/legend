import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import {EksAwsIngressController} from "../constructs/eks-aws-ingress-controller";
import {CfnOutput, StackProps} from "@aws-cdk/core";
import * as ecr from "@aws-cdk/aws-ecr";
import {LegendApplicationStack} from "./legend-application-stack";
import {ContainerInsights} from "../constructs/container-insights";
import {CapacityType} from "@aws-cdk/aws-eks";

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

    const cluster = new eks.Cluster(this, "LegendCluster", {
      role: this.clusterRole,
      vpc: vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE }],
      version: eks.KubernetesVersion.V1_18,
      placeClusterHandlerInVpc: true,
    })
    cluster.addAutoScalingGroupCapacity("ClusterCapacity", {
      instanceType: new ec2.InstanceType('m5.large'),
      minCapacity: 3,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
    })

    // TODO parameterize (somewhere) used just for debugging
    cluster.awsAuth.addMastersRole(iam.Role.fromRoleArn(this, "SuperAdmin", `arn:aws:iam::${this.account}:role/Administration`))
    cluster.awsAuth.addMastersRole(iam.Role.fromRoleArn(this, "SuperAdminSky", `arn:aws:iam::${this.account}:role/skylab-hagere`))

    new EksAwsIngressController(this, "IngressController", { cluster, vpc })
    new ContainerInsights(this, "ContainerInsights", { cluster })

    this.clusterName = new CfnOutput(this, 'ClusterName', { value: cluster.clusterName })
    if (cluster.kubectlRole !== undefined) {
      this.kubectlRoleArn = new CfnOutput(this, 'kubectlRoleArn', {value: cluster.kubectlRole?.roleArn})
    }
  }
}
