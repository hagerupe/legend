import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import {CodeBuildAction, GitHubSourceAction, GitHubTrigger} from '@aws-cdk/aws-codepipeline-actions';
import {Construct, SecretValue, Stack, StackProps} from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import {CdkPipeline, SimpleSynthAction} from "@aws-cdk/pipelines";
import {LegendInfrastructureStage} from "./legend-infrastructure-stage";
import {BuildEnvironmentVariableType} from "@aws-cdk/aws-codebuild";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ecr from "@aws-cdk/aws-ecr";
import {DockerBuildProject} from "./constructs/docker-build-project";

export class LegendPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const legendSource = new codepipeline.Artifact();
        const engineSource = new codepipeline.Artifact();
        const sdlcSource = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const githubSecret = SecretValue.secretsManager('GitHub') // TODO rename this secret
        const pipeline = new CdkPipeline(this, 'LegendPipeline', {
            pipelineName: 'Legend',
            cloudAssemblyArtifact,

            sourceAction: new codepipeline_actions.GitHubSourceAction({
                actionName: 'Legend',
                output: legendSource,
                oauthToken: githubSecret,
                owner: 'hagerupe',
                repo: 'legend',
                trigger: GitHubTrigger.POLL
            }),

            synthAction: SimpleSynthAction.standardNpmSynth({
                subdirectory: 'installers/aws-eks-cdk',
                sourceArtifact: legendSource,
                cloudAssemblyArtifact,
            }),
        });

        pipeline.codePipeline.stage('Source').addAction(new GitHubSourceAction({
            actionName: 'LegendEngine',
            output: engineSource,
            oauthToken: githubSecret,
            owner: 'hagerupe',
            repo: 'legend-engine',
            trigger: GitHubTrigger.POLL
        }))

        pipeline.codePipeline.stage('Source').addAction(new GitHubSourceAction({
            actionName: 'LegendSDLC',
            output: sdlcSource,
            oauthToken: githubSecret,
            owner: 'hagerupe',
            repo: 'legend-sdlc',
            trigger: GitHubTrigger.POLL
        }))

        const runtimeBuildStage = pipeline.addStage("Legend_Runtime_Build");

        const engineImageDetails = new codepipeline.Artifact();
        runtimeBuildStage.addActions(new CodeBuildAction({
            actionName: 'Legend_Engine',
            input: engineSource,
            project: new DockerBuildProject(this, 'LegendEngine', {
                preBuildCommands: [
                    'mvn install',
                    'cd legend-engine-server',
                ]
            }).project,
            outputs: [ engineImageDetails ]
        }))

        // TODO this build is broken in mainline
        /*const sdlcImageDetails = new codepipeline.Artifact();
        runtimeBuildStage.addActions(new CodeBuildAction({
            actionName: 'Legend_SDLC',
            input: sdlcSource,
            project: new DockerBuildProject(this, 'LegendSdlc', {
                preBuildCommands: [
                    'mvn install',
                    'cd legend-sdlc-server',
                ]
            }).project,
            outputs: [ sdlcImageDetails ]
        }))*/

        const gitlabImageDetails = new codepipeline.Artifact();
        runtimeBuildStage.addActions(new CodeBuildAction({
            actionName: 'Legend_Gitlab',
            input: legendSource,
            project: new DockerBuildProject(this, 'LegendGitlab', {
                preBuildCommands: [
                    'cd installers/aws-eks-cdk/resources/docker/gitlab-no-signup',
                ]
            }).project,
            outputs: [ gitlabImageDetails ]
        }))

        pipeline.addApplicationStage(new LegendInfrastructureStage(this, "PreProd", { env: { account: this.account, region: this.region } }))
            .addManualApprovalAction()
        pipeline.addApplicationStage(new LegendInfrastructureStage(this, "Prod", { env: { account: this.account, region: this.region } }))
    }
}