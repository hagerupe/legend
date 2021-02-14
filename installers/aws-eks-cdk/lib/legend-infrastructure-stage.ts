import {Construct, Stage, StageProps} from "@aws-cdk/core";
import {KubernetesStack} from "./stacks/kubernetes";
import {MongoStack} from "./stacks/mongo";
import {GitlabStack} from "./stacks/gitlab";
import {LegendEngineStack} from "./stacks/legend-engine";
import {LegendSdlcStack} from "./stacks/legend-sdlc";
import {LegendStudioStack} from "./stacks/legend-studio";

export interface LegendInfrastructureStageProps extends StageProps {
    repositoryNames: string[] // TODO will need to use ARNS for cross account /region
}

export class LegendInfrastructureStage extends Stage {
    constructor(scope: Construct, id: string, props: LegendInfrastructureStageProps) {
        super(scope, id, props);

        // Base networking and Kubernetes infrastructure
        const kubernetes = new KubernetesStack(this, "Kubernetes", {
            repositoryNames: props.repositoryNames
        })

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

        // Legend Engine
        const engine = new LegendEngineStack(this, "Engine", {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value
        })
        engine.addDependency(gitlab)

        // Legend SDLC
        const sdlc = new LegendSdlcStack(this, "SDLC", {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value
        })
        sdlc.addDependency(engine)
        sdlc.addDependency(mongo)
        sdlc.addDependency(gitlab)


        const studio = new LegendStudioStack(this, "Studio", {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value
        })
        studio.addDependency(engine)
        studio.addDependency(sdlc)
    }
}