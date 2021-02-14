import { Construct, Stage, StageProps } from '@aws-cdk/core';
import {KubernetesInfraStack} from "./kubernetes-infra-stack";

export class LegendCoreInfraStage extends Stage {

    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);
        const kubernetes = new KubernetesInfraStack(this, "KubernetesInfra")
    }
}