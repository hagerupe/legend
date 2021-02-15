import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import {EksAwsIngressController} from "../constructs/eks-aws-ingress-controller";
import {CfnOutput, StackProps} from "@aws-cdk/core";
import * as ecr from "@aws-cdk/aws-ecr";
import {LegendApplicationStack} from "./legend-application-stack";

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
      managedPolicies: [iam.ManagedPolicy.fromManagedPolicyArn(this, "AmazonEKSClusterPolicy",
          "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy")]
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

    this.clusterName = new CfnOutput(this, 'ClusterName', { value: eksCluster.clusterName })
    if (eksCluster.kubectlRole !== undefined) {
      this.kubectlRoleArn = new CfnOutput(this, 'kubectlRoleArn', {value: eksCluster.kubectlRole?.roleArn})
    }
  }
}
