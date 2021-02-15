import {Construct, Stage, StageProps} from "@aws-cdk/core";
import {KubernetesStack} from "./stacks/kubernetes";
import {MongoStack} from "./stacks/mongo";
import {GitlabStack} from "./stacks/gitlab";
import {LegendEngineStack} from "./stacks/legend-engine";

export interface LegendInfrastructureStageProps extends StageProps {
    repositoryNames: string[],
}

export class LegendInfrastructureStage extends Stage {
    constructor(scope: Construct, id: string, props: LegendInfrastructureStageProps) {
        super(scope, id, props);

        // Base networking and Kubernetes infrastructure
        const kubernetes = new KubernetesStack(this, "Kubernetes", {
            repositoryNames: props.repositoryNames
        })

        const mongo = new MongoStack(this, "Mongo", {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value
        })
        mongo.addDependency(kubernetes)

        const gitlab = new GitlabStack(this, "Gitlab", {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value,
        })
        gitlab.addDependency(kubernetes)

        const engine = new LegendEngineStack(this, "Engine", {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value
        })
        engine.addDependency(gitlab)
    }
}