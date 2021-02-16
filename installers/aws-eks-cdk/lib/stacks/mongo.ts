import {StackProps} from '@aws-cdk/core';
import * as eks from '@aws-cdk/aws-eks';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import {MongoChart} from "../charts/mongo-chart";
import * as cdk8s from 'cdk8s'
import * as cdk from "@aws-cdk/core";
import {LegendApplicationStack} from "./legend-application-stack";
import {ResolveSecret} from "../constructs/resolve-secret";

export interface MongoStackProps extends StackProps{
    clusterName: string,
    kubectlRoleArn: string
}

export class MongoStack extends LegendApplicationStack {
    constructor(scope: cdk.Construct, id: string, props: MongoStackProps) {
        super(scope, id, props);

        const cluster = eks.Cluster.fromClusterAttributes(this, "KubernetesCluster", props)
        const mongoPassword = new secretsmanager.Secret(this, "MongoPassword");
        // TODO use external secrets reference CRDS in K8
        const resolveSecret = new ResolveSecret(this, "ResolveMongoPassword", { secret: mongoPassword })
        cluster.addCdk8sChart("Mongo", new MongoChart(new cdk8s.App(), "MongoChart", {
            password: resolveSecret.response
        }))
    }
}