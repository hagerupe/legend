import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";

export interface LegendEngineChartProps {
    readonly imageId: string,
    readonly gitlabOauthClientId: string,
    readonly gitlabOauthSecret: string,
    readonly gitlabPublicUrl: string,
    readonly mongoUser: string,
    readonly mongoPassword: string,
    readonly mongoHostPort: number,
    readonly legendEnginePort: number
}

export class LegendEngineChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: LegendEngineChartProps) {
        super(scope, id);

        const templateText = fs.readFileSync(path.join('resources', 'configs', 'engine', 'config.json'), {encoding: 'utf8'})
            .replace('__GITLAB_OAUTH_CLIENT_ID__', props.gitlabOauthClientId)
            .replace('__GITLAB_OAUTH_SECRET__', props.gitlabOauthSecret)
            .replace('__GITLAB_PUBLIC_URL__', props.gitlabPublicUrl)
            .replace('__MONGO_USER__', props.mongoUser)
            .replace('__MONGO_PASSWORD__', props.mongoPassword)
            .replace('__MONGO_HOST_PORT__', String(props.mongoHostPort))
            .replace('__LEGEND_ENGINE_PORT__', String(props.legendEnginePort))

        const config = new k8s.ConfigMap(this, "Config", {
            data: {
                'config.json': templateText
            }
        })

        // TODO get image from build input source
        const app = 'legend-engine'
        const service = app + "-service"
        new k8s.Deployment(this, "LegendEngine", {
            spec: {
                selector: {
                    matchLabels: {
                        app: app
                    }
                },
                replicas: 1,
                template: {
                    metadata: {
                        labels: {
                            app: app
                        }
                    },
                    spec: {
                        containers: [
                            {
                                name: 'legend-engine',
                                image: props.imageId,
                                volumeMounts: [
                                    {
                                        name: 'configurations',
                                        mountPath: '/config'
                                    }
                                ]
                            }
                        ],
                        volumes: [
                            {
                                name: 'configurations',
                                configMap: {
                                    name: config.name,
                                    items: [
                                        {
                                            key: 'config.json',
                                            path: 'config.json'
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            }
        })

        new k8s.Service(this, "LegendEngineService", {
            metadata: {
                name: service,
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
                    app: app
                }
            },
        })

    }
}