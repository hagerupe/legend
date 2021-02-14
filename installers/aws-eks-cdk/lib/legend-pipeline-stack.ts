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
        const engineImageDetails = new codepipeline.Artifact();
        const cloudAssemblyArtifact = new codepipeline.Artifact();

        // TODO move to construct
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
                            'echo Logging in to Amazon ECR...',
                            'aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com',
                            'echo Logging in to DockerHub...',
                            'DOCKERHUB_USER=$(echo $DOCKER_HUB_CREDS | jq -r \'.Username\')',
                            'DOCKERHUB_PASSWORD=$(echo $DOCKER_HUB_CREDS | jq -r \'.Password\')',
                            'echo $DOCKERHUB_PASSWORD | docker login --username $DOCKERHUB_USER --password-stdin',
                            'COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)',
                            'IMAGE_TAG=${COMMIT_HASH:=latest}',
                            '$REPOSITORY_URI=$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME'
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
                            'docker tag $IMAGE_REPO_NAME:$IMAGE_TAG $REPOSITORY_URI:$IMAGE_TAG',
                            'printf \'{"ImageURI":"%s"}\' $REPOSITORY_URI:$IMAGE_TAG > imageDetail.json'
                        ]
                    },
                    post_build: {
                        commands: [
                            'docker push $REPOSITORY_URI:$IMAGE_TAG'
                        ]
                    },
                },
                artifacts: {
                    files: [
                        'imageDetail.json'
                    ]
                }
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
                privileged: true,
                environmentVariables: {
                    'IMAGE_REPO_NAME' : {
                        type: BuildEnvironmentVariableType.PLAINTEXT,
                        value: legendEngineRepo.repositoryName
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

        const runtimeBuildStage = pipeline.addStage("Legend_Runtime_Build");
        runtimeBuildStage.addActions(new CodeBuildAction({
            actionName: 'BuildLegendEngine',
            input: engineSource,
            project: engineBuild,
            outputs: [ engineImageDetails ]
        }))


        const preProdInfraStage = new LegendInfrastructureStage(this, "PreProd", { env: { account: this.account, region: this.region } })
        pipeline.addApplicationStage(preProdInfraStage)
    }
}