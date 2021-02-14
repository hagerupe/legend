import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import {GitHubTrigger} from '@aws-cdk/aws-codepipeline-actions';
import {Construct, SecretValue, Stack, StackProps} from '@aws-cdk/core';
import {CdkPipeline, SimpleSynthAction} from "@aws-cdk/pipelines";
import {LegendInfrastructureStage} from "./LegendInfrastructureStage";

export class LegendPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const sourceArtifact = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const pipeline = new CdkPipeline(this, 'LegendPipeline', {
            pipelineName: 'Legend',
            cloudAssemblyArtifact,

            sourceAction: new codepipeline_actions.GitHubSourceAction({
                actionName: 'GitHub',
                output: sourceArtifact,
                oauthToken: SecretValue.secretsManager('GitHub'), // TODO rename this secret
                owner: 'hagerupe',
                repo: 'legend',
                trigger: GitHubTrigger.POLL
            }),

            synthAction: SimpleSynthAction.standardNpmSynth({
                subdirectory: 'installers/aws-eks-cdk',
                sourceArtifact,
                cloudAssemblyArtifact,
            }),
        });

        const preProdInfraStage = new LegendInfrastructureStage(this, "PreProd", { env: { account: this.account, region: this.region } })

        pipeline.addApplicationStage(preProdInfraStage)
    }
}