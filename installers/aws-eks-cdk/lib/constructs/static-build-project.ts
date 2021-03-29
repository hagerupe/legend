import {Construct, RemovalPolicy, SecretValue, Stack} from "@aws-cdk/core";
import * as ecr from "@aws-cdk/aws-ecr";
import * as secretsmanager from "@aws-cdk/aws-secretsmanager";
import * as codebuild from "@aws-cdk/aws-codebuild";
import {BuildEnvironmentVariableType} from "@aws-cdk/aws-codebuild";

export interface StaticBuildProjectProps {
    preBuildCommands: string[]
}

export class StaticBuildProject extends Construct {

    readonly project: codebuild.Project

    constructor(scope: Construct, id: string, props: StaticBuildProjectProps) {
        super(scope, id);

        this.project = new codebuild.PipelineProject(this, 'Project', {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    build: {
                        commands: [
                            'echo "NoOp"'
                        ]
                    },
                },
                artifacts: {
                    files: [
                        'legend.yaml'
                    ]
                }
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_4_0,
                environmentVariables: { }
            },
        });
    }
}