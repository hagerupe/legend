import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as lambda from '@aws-cdk/aws-lambda';
import cdk = require('@aws-cdk/core');
import { CodeBuildAction, GitHubSourceAction, GitHubTrigger } from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import {CdkPipeline} from "./override/pipelines/lib";
import {LegendInfrastructureStage} from "./legend-infrastructure-stage";
import {DockerBuildProject} from "./constructs/docker-build-project";
import {SimpleSynthAction} from "./override/pipelines/lib/synths";
import * as path from "path";
import * as fs from "fs";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import {ResolveSecret, ResolveSecretFunction} from "./constructs/resolve-secret";
import * as iam from "@aws-cdk/aws-iam";
import * as ssm from "@aws-cdk/aws-ssm";
import {StaticBuildProject} from "./constructs/static-build-project";
import {ManagedPolicy} from "@aws-cdk/aws-iam";
import {ArtifactImageIdFunction} from "./constructs/artifact-image-id";
import {ResolveConfigFunction} from "./constructs/resolve-config";
import {GitlabAppConfig, GitlabAppConfigFunction} from "./constructs/gitlab-app-config";

export class LegendPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const configSource = new codepipeline.Artifact();
        const legendSource = new codepipeline.Artifact();
        const engineSource = new codepipeline.Artifact();
        const sdlcSource = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const githubSecret = SecretValue.secretsManager('github-access-token')
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
            actionName: 'LegendConfig',
            output: configSource,
            oauthToken: githubSecret,
            owner: 'hagerupe',
            repo: 'lengend-config',
            branch: 'main',
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

        const configArtifact = new codepipeline.Artifact();
        runtimeBuildStage.addActions(new CodeBuildAction({
            actionName: 'Legend_Config',
            input: configSource,
            project: new StaticBuildProject(this, 'LegendConfigProject',  {}).project,
            outputs: [ configArtifact ]
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

        // https://console.aws.amazon.com/codesuite/codebuild/752499117019/projects/LegendSDLCProject1E6074E7-lgyP9viVXqkI/build/LegendSDLCProject1E6074E7-lgyP9viVXqkI%3A64cec97b-ffd3-43a7-bc79-f06556d63ec9/?region=us-east-1
        const sdlcImageDetails = new codepipeline.Artifact();
        const sdlcRepositoryName = 'legend-sdlc';
        const sdlcProject = new DockerBuildProject(this, 'LegendSDLC', {
            preBuildCommands: [
                'mvn install',
                'cd legend-sdlc-server',
            ],
            repositoryName: sdlcRepositoryName
        })
        runtimeBuildStage.addActions(new CodeBuildAction({
            actionName: 'Legend_SDLC',
            input: sdlcSource,
            project: sdlcProject.project,
            outputs: [ sdlcImageDetails ]
        }))

        const repositoryNames = [gitlabRepositoryName, engineRepositoryName]
        const appStageOptions = {
            parameterOverrides: {
                GitlabArtifactBucketName: gitlabImageDetails.bucketName,
                GitlabArtifactObjectKey: gitlabImageDetails.objectKey,
                EngineArtifactBucketName: engineImageDetails.bucketName,
                EngineArtifactObjectKey: engineImageDetails.objectKey,
                SDLCArtifactBucketName: sdlcImageDetails.bucketName,
                SDLCArtifactObjectKey: sdlcImageDetails.objectKey,

                ConfigArtifactBucketName: configArtifact.bucketName,
                ConfigArtifactObjectKey: configArtifact.objectKey,
            },
            extraInputs: [
                gitlabImageDetails,
                engineImageDetails,
                sdlcImageDetails,
                configArtifact,
            ]
        }

        const masterRoleAccessName = ssm.StringParameter.valueForStringParameter(this, 'master-role-access');
        const masterRoleAssumedBy = iam.Role.fromRoleArn(this, "MasterRoleAssumedBy", `arn:aws:iam::${this.account}:role/${masterRoleAccessName}`)
        const kubernetesMasterRole = new iam.Role(this, "KubernetesMasterRole", {
            roleName: 'KubernetesMasterRole',
            assumedBy: new iam.ArnPrincipal(masterRoleAssumedBy.roleArn)});
        kubernetesMasterRole.addManagedPolicy(iam.ManagedPolicy.fromManagedPolicyArn(this,
            "KubernetesMasterRoleAdministratorAccess", "arn:aws:iam::aws:policy/AdministratorAccess"))

        new ArtifactImageIdFunction(this, 'ArtifactImageId', { artifactBucket: pipeline.codePipeline.artifactBucket })
        new ResolveSecretFunction(this, 'ResolveSecret')
        new ResolveConfigFunction(this, 'ResolveConfig', { artifactBucket: pipeline.codePipeline.artifactBucket })
        new GitlabAppConfigFunction(this, 'GitlabAppConfig')

        const eksAlbCname = new lambda.SingletonFunction(this, 'EKSALBCnameFunction', {
            functionName: 'EKSALBCnameFunction',
            uuid: 'ca78d3ae-8eb2-4b7e-84af-541ee71bd98a',
            code: new lambda.InlineCode(fs.readFileSync(path.join('lib', 'handlers', 'eksAlbCname', 'index.py'), { encoding: 'utf-8' })),
            handler: 'index.main',
            timeout: cdk.Duration.seconds(300),
            runtime: lambda.Runtime.PYTHON_3_6,
        })

        pipeline.addApplicationStage(new LegendInfrastructureStage(this, "UAT", {
            env: { account: this.account, region: this.region },
            repositoryNames: repositoryNames,
            prefix: 'uat.'
        }), appStageOptions)

        pipeline.addApplicationStage(new LegendInfrastructureStage(this, "Prod", {
            env: { account: this.account, region: this.region },
            repositoryNames: repositoryNames,
        }), appStageOptions)
    }
}