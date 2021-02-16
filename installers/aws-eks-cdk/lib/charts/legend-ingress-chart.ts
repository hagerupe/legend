import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";

export interface LegendIngressChartProps {
    readonly legendDomain: string
}

export class LegendIngressChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: LegendIngressChartProps) {
        super(scope, id);

        new k8s.Ingress(this, "LegendIngress", {
            metadata: {
                name: 'legend-ingress',
                annotations: {
                    'kubernetes.io/ingress.class': 'alb',
                    'alb.ingress.kubernetes.io/listen-ports': '[{"HTTPS":443}]',
                    'alb.ingress.kubernetes.io/scheme': 'internet-facing',
                },
            },
            spec: {
                rules: [
                    {
                        host: props.legendDomain,
                        http: {
                            paths: [{
                                path: '/sudio/*',
                                backend: {
                                    serviceName: 'legend-studio-service',
                                    servicePort: 80,
                                }
                            }],
                        }
                    }
                ]
            }
        })
    }
}