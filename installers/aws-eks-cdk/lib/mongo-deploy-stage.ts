import { CfnOutput, Construct, Stage, StageProps } from '@aws-cdk/core';
import {KubernetesInfraStage} from "./kubernetes-infra-stage";

export class MongoDeployStage extends Stage {

    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);
        const mongo = new KubernetesInfraStage(this, 'LegendStack');
    }
}