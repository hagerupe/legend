import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import {Quantity} from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";

export interface GitlabCeChartProps {
    gitlabExternalUrl: string,
    gitlabRootPassword: string,
    image: string,
}

export class GitlabCeChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: GitlabCeChartProps) {
        super(scope, id);

        const templateText = fs.readFileSync(path.join('resources', 'configs', 'gitlab', 'omnibus.config'), {encoding: 'utf8'})
            .replace('__GITLAB_EXTERNAL_URL__', props.gitlabExternalUrl)
            .replace('__GITLAB_ROOT_PASSWORD__', props.gitlabRootPassword)

        // TODO This isn't actually durable...
        const  deployment = new k8s.Deployment(this, "GitlabCE", {
            spec: {
                selector: {
                    matchLabels: {
                        app: 'gitlab-ce'
                    }
                },
                replicas: 1,
                template: {
                    metadata: {
                        labels: {
                            app: 'gitlab-ce'
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: 'gitlab-ce',
                                image: props.image,
                                env: [
                                    {
                                        name: 'GITLAB_OMNIBUS_CONFIG',
                                        value: templateText,
                                    }
                                ],
                                resources: {
                                    requests: {
                                        memory: Quantity.fromString("2048Mi"),
                                        cpu: Quantity.fromString("2000m")
                                    }
                                },
                                // TODO volume mount
                            }
                        ]
                    }
                }
            }
        })

        const service = new k8s.Service(this, "GitlabCEService", {
            metadata: {
                name: 'gitlab-ce-service',
                annotations: {
                    'service.beta.kubernetes.io/aws-load-balancer-type': 'nlb-ip'
                }
            },
            spec: {
                ports: [
                    {
                        port: 443,
                        targetPort: 443,
                        protocol: 'TCP'
                    },
                ],
                type: 'LoadBalancer',
                selector: {
                    app: 'gitlab-ce'
                }
            },
        })

    }
}