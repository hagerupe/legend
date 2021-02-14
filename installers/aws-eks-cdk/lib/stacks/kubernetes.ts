import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import {EksAwsIngressController} from "../constructs/eks-aws-ingress-controller";
import {CfnOutput} from "@aws-cdk/core";

export class KubernetesStack extends cdk.Stack {

  readonly clusterName: CfnOutput;
  readonly kubectlRoleArn: CfnOutput;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc');

    const eksClusterRole = new iam.Role(this, "LegendClusterRole", {
      assumedBy: new iam.ServicePrincipal("eks"),
      managedPolicies: [iam.ManagedPolicy.fromManagedPolicyArn(this, "AmazonEKSClusterPolicy",
          "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy")]
    })

    const eksCluster = new eks.FargateCluster(this, "LegendCluster", {
      role: eksClusterRole,
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
