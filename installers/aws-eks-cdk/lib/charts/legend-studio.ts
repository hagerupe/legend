import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import * as fs from "fs";
import * as path from "path";

export interface LegendStudioChartProps {

}

export class LegendStudioChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: LegendStudioChartProps) {
        super(scope, id);

        // TODO update these based off of config
        // TODO add the other config file
        const templateText = fs.readFileSync(path.join('resources', 'configs', 'studio', 'httpConfig.json'), {encoding: 'utf8'})
            .replace('__GITLAB_OAUTH_CLIENT_ID__', 'foo')
            .replace('__GITLAB_OAUTH_SECRET__', 'foo')
            .replace('__GITLAB_PUBLIC_URL__', 'foo')
            .replace('__MONGO_USER__', 'foo')
            .replace('__MONGO_PASSWORD__', 'foo')
            .replace('__MONGO_HOST_PORT__', 'foo')
            .replace('__LEGEND_SDLC_URL__', '1234')
            .replace('__LEGEND_SDLC_PORT__', '1234')

        const config = new k8s.ConfigMap(this, "Config", {
            data: {
                'httpConfig.json': templateText
            }
        })

        // TODO get image from build input source
        const app = 'legend-studio'
        const service = app + "-service"
        new k8s.Deployment(this, "LegendStudio", {
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
                                            key: 'httpConfig.json',
                                            path: 'httpConfig.json'
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                }
            }
        })

        new k8s.Service(this, "LegendStudioService", {
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