import {Stack, StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks'
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import {MongoChart} from "../charts/mongo-chart";
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";

export interface MongoStackProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class MongoStack extends Stack {
    constructor(scope: cdk.Construct, id: string, props: MongoStackProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", {
            clusterName: props.clusterName,
            kubectlRoleArn: props.kubectlRoleArn
        })

        const mongoPassword = new secretsmanager.Secret(this, "MongoPassword");
        cluster.addCdk8sChart("Mongo", new MongoChart(new cdk8s.App(), "MongoChart", {
            password: mongoPassword.secretValue.toString()
        }))
    }
}