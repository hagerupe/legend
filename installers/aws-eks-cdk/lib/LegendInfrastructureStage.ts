import {Construct, Stage, StageProps} from "@aws-cdk/core";
import {KubernetesStack} from "./stacks/kubernetes";
import {MongoStack} from "./stacks/mongo";
import {GitlabStack} from "./stacks/gitlab";

export class LegendInfrastructureStage extends Stage {
    constructor(scope: Construct, id: string, props?: StageProps) {
        super(scope, id, props);

        // Base networking and Kubernetes infrastructure
        const kubernetes = new KubernetesStack(this, "Kubernetes")

        // Mongo DB database used for ???? TODO
        const mongo = new MongoStack(this, "Mongo", {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value
        })
        mongo.addDependency(kubernetes)

        // Gitlab CE TODO there's some config needed here.
        const gitlab = new GitlabStack(this, "Gitlab", {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value
        })
        gitlab.addDependency(kubernetes)
    }
}
