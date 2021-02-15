import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";

export interface LegendEngineChartProps {
    gitlabOauthClientId: string,
    gitlabOauthSecret: string,
    gitlabPublicUrl: string,
    mongoUser: string,
    mongoPassword: string,
    mongoHostPort: number,
    legendEnginePort: number
}

export class LegendEngineChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: LegendEngineChartProps) {
        super(scope, id);

        const templateText = fs.readFileSync(path.join('resources', 'configs', 'engine', 'config.json'), {encoding: 'utf8'})
            .replace('__GITLAB_OAUTH_CLIENT_ID__', props.gitlabOauthClientId)
            .replace('__GITLAB_OAUTH_SECRET__', props.gitlabOauthSecret)
            .replace('__GITLAB_PUBLIC_URL__', props.gitlabPublicUrl)
            .replace('__MONGO_USER__', props.mongoUser)
            .replace('__MONGO_PASSWORD__', props.mongoPassword) // TODO should be in secret store not a config file...
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
                                image: 'k8s.gcr.io/busybox',
                                command: [ "/bin/sh", "-c", "ls /etc/config/" ],
                                volumeMounts: [
                                    {
                                        name: 'configurations',
                                        mountPath: '/etc/config'
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
                        port: 80,
                        targetPort: 80,
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