import {Construct, Stage, StageProps} from "@aws-cdk/core";
import {KubernetesStack} from "./stacks/kubernetes";
import {MongoStack} from "./stacks/mongo";

export class LegendInfrastructureStage extends Stage {
    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);
        const kubernetes = new KubernetesStack(this, "Kubernetes")

        const mongo = new MongoStack(this, "Mongo", {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value
        })
        mongo.addDependency(kubernetes)
    }
}
