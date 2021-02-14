import {CfnOutput, Construct, Stack, StackProps, Stage, StageProps} from '@aws-cdk/core';
import {KubernetesStack} from "./kubernetes";
import * as eks from '@aws-cdk/aws-eks'
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import {MongoChart} from "../charts/mongo-chart";
import * as cdk8s from 'cdk8s'

export class MongoStage extends Stage {

    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

    }
}

export interface MongoStackProps extends StackProps{
    //cluster: eks.Cluster
}

export class MongoStack extends Stack {
    constructor(scope: Stack, id: string, props: MongoStackProps) {
        super(scope, id, props);

        const mongoPassword = new secretsmanager.Secret(this, "MongoPassword");
        /*props.cluster.addCdk8sChart("Mongo", new MongoChart(new cdk8s.App(), "MongoChart", {
            password: mongoPassword.secretValue.toString()
        }))*/
    }
}