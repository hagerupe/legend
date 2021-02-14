import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import {CodeBuildAction, GitHubSourceAction, GitHubTrigger} from '@aws-cdk/aws-codepipeline-actions';
import {Construct, SecretValue, Stack, StackProps} from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import {CdkPipeline, SimpleSynthAction} from "@aws-cdk/pipelines";
import {LegendInfrastructureStage} from "./LegendInfrastructureStage";
import {BuildEnvironmentVariableType} from "@aws-cdk/aws-codebuild";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as ecr from "@aws-cdk/aws-ecr";

export class LegendPipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const sourceArtifact = new codepipeline.Artifact();
        const engineSource = new codepipeline.Artifact();
        const sdlcSource = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        const githubSecret = SecretValue.secretsManager('GitHub') // TODO rename this secret
        const pipeline = new CdkPipeline(this, 'LegendPipeline', {
            pipelineName: 'Legend',
            cloudAssemblyArtifact,

            sourceAction: new codepipeline_actions.GitHubSourceAction({
                actionName: 'Legend',
                output: sourceArtifact,
                oauthToken: githubSecret,
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

        const legendEngineRepo = new ecr.Repository(this, 'LegendEngineRepo')
        const dockerHubSecret = secretsmanager.Secret.fromSecretPartialArn(this, "DockerHubCredentials", `arn:aws:secretsmanager:${this.region}:${this.account}:secret:DockerHub`)
        const engineBuild = new codebuild.PipelineProject(this, 'LegendEngineBuild', {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    pre_build: {
                        commands: [
                            'DOCKERHUB_USER=$(echo $DOCKER_HUB_CREDS | jq -r \'.Username\')',
                            'DOCKERHUB_PASSWORD=$(echo $DOCKER_HUB_CREDS | jq -r \'.Password\')',
                            'echo $DOCKERHUB_PASSWORD | docker login --username $DOCKERHUB_USER --password-stdin',
                            'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com'
                        ]
                    },
                    install: {
                        commands: [
                            'mvn install',
                            'cd legend-engine-server',
                        ],
                    },
                    build: {
                        commands: [
                            'docker build -t $IMAGE_REPO_NAME:$IMAGE_TAG .',
                            'docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG',
                        ]
                    },
                    post_build: {
                        commands: [
                            'docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME:$IMAGE_TAG'
                        ]
                    }
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
                privileged: true,
                environmentVariables: {
                    'IMAGE_REPO_NAME' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: legendEngineRepo.repositoryName
                    },
                    'IMAGE_TAG' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: 'latest'
                    },
                    'AWS_DEFAULT_REGION' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: Stack.of(this).region
                    },
                    'AWS_ACCOUNT_ID' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: Stack.of(this).account
                    },
                    'DOCKER_HUB_CREDS': {
                        type: BuildEnvironmentVariableType.SECRETS_MANAGER,
                        value: dockerHubSecret.secretName
                    },
                }
            },
        });
        legendEngineRepo.grantPullPush(engineBuild)

        pipeline.codePipeline.stage('Build').addAction(new CodeBuildAction({
            actionName: 'BuildGitlab',
            input: sourceArtifact,
            project: engineBuild,
        }))

        const preProdInfraStage = new LegendInfrastructureStage(this, "PreProd", { env: { account: this.account, region: this.region } })

        pipeline.addApplicationStage(preProdInfraStage)
    }
}