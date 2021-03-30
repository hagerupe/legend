import {Construct, Stage, StageProps} from "@aws-cdk/core";
import {KubernetesStack} from "./stacks/kubernetes";
import {MongoStack} from "./stacks/mongo";
import {GitlabStack} from "./stacks/gitlab";
import {LegendEngineStack} from "./stacks/legend-engine";
import {LegendSdlcStack} from "./stacks/legend-sdlc";
import {LegendStudioStack} from "./stacks/legend-studio";
import {LegendIngressStack} from "./stacks/legend-ingress";

export interface LegendInfrastructureStageProps extends StageProps {
    repositoryNames: string[],
    prefix?: string,
}

export class LegendInfrastructureStage extends Stage {
    constructor(scope: Construct, id: string, props: LegendInfrastructureStageProps) {
        super(scope, id, props);

        // Base networking and Kubernetes infrastructure
        const kubernetes = new KubernetesStack(this, "Kubernetes", {
            repositoryNames: props.repositoryNames,
            env: props.env
        })

        const stackParams = {
            clusterName: kubernetes.clusterName.value,
            kubectlRoleArn: kubernetes.kubectlRoleArn.value,
            env: props.env,
            stage: props,
        }

        const mongo = new MongoStack(this, "Mongo", stackParams)
        mongo.addDependency(kubernetes)

        const gitlab = new GitlabStack(this, "Gitlab", stackParams)
        gitlab.addDependency(kubernetes)

        const engine = new LegendEngineStack(this, "Engine", {
            ...{ gitlabRootSecret: gitlab.gitlabRootSecret },
            ...stackParams,
        })
        engine.addDependency(gitlab)

        const sdlc = new LegendSdlcStack(this, "SDLC", {
            ...{ gitlabRootSecret: gitlab.gitlabRootSecret },
            ...stackParams,
        })
        sdlc.addDependency(gitlab)
        sdlc.addDependency(engine)

        const studio = new LegendStudioStack(this, "Studio", stackParams)
        studio.addDependency(sdlc)

        const ingress = new LegendIngressStack(this, "Ingress", stackParams);
        ingress.addDependency(studio)
    }
}