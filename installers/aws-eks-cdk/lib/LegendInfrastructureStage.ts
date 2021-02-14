import {Construct, Stage, StageProps} from "@aws-cdk/core";
import * as eks from "@aws-cdk/aws-eks";
import {KubernetesStack} from "./stacks/kubernetes";
import {MongoStack} from "./stacks/mongo";

export class LegendInfrastructureStage extends Stage {
    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);
        const kubernetes = new KubernetesStack(this, "Kubernetes")
        //const mongo = new MongoStack(this, "Mongo", { cluster: kubernetes.cluster })
    }
}
