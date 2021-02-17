import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";

export interface LegendSdlcProps {
    readonly imageId: string
    readonly legendSdlcPort: number,
    readonly gitlabOauthClientId: string,
    readonly gitlabOauthSecret: string,
    readonly gitlabPublicUrl: string,
    readonly mongoUser: string,
    readonly mongoPassword: string,
    readonly mongoHostPort: string,
    readonly gitlabHost: string,
    readonly gitlabPort: number,
    readonly legendSdlcUrl: string,
}

export class LegendSdlcChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: LegendSdlcProps) {
        super(scope, id);

        // TODO update these based off of config
        const templateText = fs.readFileSync(path.join('resources', 'configs', 'sdlc', 'config.json'), {encoding: 'utf8'})
            .replace('__LEGEND_SDLC_PORT__', String(props.legendSdlcPort))
            .replace('__GITLAB_OAUTH_CLIENT_ID__', props.gitlabOauthClientId)
            .replace('__GITLAB_OAUTH_SECRET__', props.gitlabOauthSecret)
            .replace('__GITLAB_PUBLIC_URL__', props.gitlabPublicUrl)
            .replace('__MONGO_USER__', props.mongoUser)
            .replace('__MONGO_PASSWORD__', props.mongoPassword)
            .replace('__MONGO_HOST_PORT__', props.mongoHostPort)
            .replace('__GITLAB_HOST__', props.gitlabHost)
            .replace('__GITLAB_PORT__', String(props.legendSdlcPort))
            .replace('__LEGEND_SDLC_URL__', props.legendSdlcUrl)

        const config = new k8s.ConfigMap(this, "Config", {
            data: {
                'config.json': templateText
            }
        })

        // TODO get image from build input source
        const app = 'legend-sdlc'
        const service = app + "-service"
        new k8s.Deployment(this, "LegendSdlc", {
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

        new k8s.Service(this, "LegendSDLCService", {
            metadata: {
                name: service,
            },
            spec: {
                ports: [
                    {
                        port: 80,
                        targetPort: 80,
                        protocol: 'TCP'
                    },
                ],
                type: 'NodePort',
                selector: {
                    app: app
                }
            },
        })
    }
}