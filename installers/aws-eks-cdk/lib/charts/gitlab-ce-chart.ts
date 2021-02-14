import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";
import {Quantity} from "cdk8s-plus/lib/imports/k8s";

export interface GitlabCeChartProps {

}

export class GitlabCeChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: GitlabCeChartProps) {
        super(scope, id);

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
                                image: 'gitlab/gitlab-ce',
                                resources: {
                                    requests: {
                                        memory: Quantity.fromString("2048Mi"),
                                        cpu: Quantity.fromString("2000m")
                                    }
                                }
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
                        port: 80,
                        targetPort: 80,
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