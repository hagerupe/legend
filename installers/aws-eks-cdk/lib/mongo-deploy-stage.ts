import { CfnOutput, Construct, Stage, StageProps } from '@aws-cdk/core';
import {KubernetesInfraStack} from "./kubernetes-infra-stack";

export class MongoDeployStage extends Stage {

    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);
        const mongo = new KubernetesInfraStack(this, 'LegendStack');
    }
}