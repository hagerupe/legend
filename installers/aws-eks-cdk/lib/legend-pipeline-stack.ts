import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as lambda from '@aws-cdk/aws-lambda';
import cdk = require('@aws-cdk/core');
import { CodeBuildAction, GitHubSourceAction, GitHubTrigger } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import {CdkPipeline} from "./override/pipelines/lib/pipeline";
import {LegendInfrastructureStage} from "./legend-infrastructure-stage";
import {DockerBuildProject} from "./constructs/docker-build-project";
import {SimpleSynthAction} from "./override/pipelines/lib/synths";
import * as path from "path";
import * as fs from "fs";

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

        pipeline.codePipeline.stage('Source').addAction(new GitHubSourceAction({
            actionName: 'LegendStudio',
            output: sdlcSource,
            oauthToken: githubSecret,
            owner: 'hagerupe',
            repo: 'legend-studio',
            trigger: GitHubTrigger.POLL
        }))

        const runtimeBuildStage = pipeline.addStage("Legend_Runtime_Build");

        const engineImageDetails = new codepipeline.Artifact();
        const engineRepositoryName = 'legend-engine'
        const legendEngineProject = new DockerBuildProject(this, 'LegendEngine', {
            preBuildCommands: [
                'mvn install',
                'cd legend-engine-server',
            ],
            repositoryName: engineRepositoryName,
        });
        runtimeBuildStage.addActions(new CodeBuildAction({
            actionName: 'Legend_Engine',
            input: engineSource,
            project: legendEngineProject.project,
            outputs: [ engineImageDetails ]
        }))

        const gitlabImageDetails = new codepipeline.Artifact();
        const gitlabRepositoryName = 'legend-gitlab';
        const gitlabProject = new DockerBuildProject(this, 'LegendGitlab', {
            preBuildCommands: [
                'cd installers/aws-eks-cdk/resources/docker/gitlab-no-signup',
            ],
            repositoryName: gitlabRepositoryName
        })
        runtimeBuildStage.addActions(new CodeBuildAction({
            actionName: 'Legend_Gitlab',
            input: legendSource,
            project: gitlabProject.project,
            outputs: [ gitlabImageDetails ]
        }))

        const repositoryNames = [gitlabRepositoryName, engineRepositoryName]
        const appStageOptions = {
            parameterOverrides: {
                GitlabArtifactBucketName: gitlabImageDetails.bucketName,
                GitlabArtifactObjectKey: gitlabImageDetails.objectKey,
                EngineArtifactBucketName: engineImageDetails.bucketName,
                EngineArtifactObjectKey: engineImageDetails.objectKey,
            },
            extraInputs: [
                gitlabImageDetails,
                engineImageDetails,
            ]
        }

        const artifactImageIdFunction = new lambda.SingletonFunction(this, 'ArtifactImageId', {
            functionName: 'ArtifactImageId',
            uuid: 'f7d4f730-4ee1-11e8-9c2d-fa7ae01bbebc',
            code: new lambda.InlineCode(fs.readFileSync(path.join('resources', 'handlers', 'artifactImageId', 'index.py'), { encoding: 'utf-8' })),
            handler: 'index.main',
            timeout: cdk.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_3_6,
        })
        pipeline.codePipeline.artifactBucket.encryptionKey?.grantDecrypt(artifactImageIdFunction)
        pipeline.codePipeline.artifactBucket.grantRead(artifactImageIdFunction)

        const resolveFunction = new lambda.SingletonFunction(this, 'ResolveSecret', {
            functionName: 'ResolveSecret',
            uuid: 'def1918a-6fbb-11eb-9439-0242ac130002',
            code: new lambda.InlineCode(fs.readFileSync(path.join('resources', 'handlers', 'resolveSecret', 'index.py'), { encoding: 'utf-8' })),
            handler: 'index.main',
            timeout: cdk.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_3_6,
        })

        pipeline.addApplicationStage(new LegendInfrastructureStage(this, "UAT", {
            env: { account: this.account, region: this.region },
            repositoryNames: repositoryNames,
        }), appStageOptions).addManualApprovalAction()

        pipeline.addApplicationStage(new LegendInfrastructureStage(this, "Prod", {
            env: { account: this.account, region: this.region },
            repositoryNames: repositoryNames,
        }), appStageOptions)
    }
}