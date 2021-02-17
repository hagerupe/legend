import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import * as k8s from "cdk8s-plus/lib/imports/k8s";

export interface LegendIngressChartProps {
    readonly legendDomain: string
}

export class LegendIngressChart extends cdk8s.Chart {

    static synth() {
        const app = new cdk8s.App();
        new LegendIngressChart(app, "LegendIngressChart", {
            legendDomain: 'sky-hagere.io',
        })
        app.synth()
    }

    constructor(scope: constructs.Construct, id: string, props: LegendIngressChartProps) {
        super(scope, id);

        new k8s.Ingress(this, "LegendIngress", {
            metadata: {
                name: 'legend-ingress',
                annotations: {
                    'kubernetes.io/ingress.class': 'alb',
                    'alb.ingress.kubernetes.io/listen-ports': '[{"HTTPS":443}]',
                    'alb.ingress.kubernetes.io/scheme': 'internet-facing',
                    'alb.ingress.kubernetes.io/success-codes': '200,201,302,401',
                },
            },
            spec: {
                rules: [
                    {
                        host: `sdlc.${props.legendDomain}`,
                        http: {
                            paths: [{
                                path: '/',
                                backend: {
                                    serviceName: 'legend-sdlc-service',
                                    servicePort: 80,
                                }
                            }],
                        }
                    },
                    {
                        host: `engine.${props.legendDomain}`,
                        http: {
                            paths: [{
                                path: '/',
                                backend: {
                                    serviceName: 'legend-engine-service',
                                    servicePort: 80,
                                }
                            }],
                        }
                    },
                    {
                        host: props.legendDomain,
                        http: {
                            paths: [{
                                path: '/studio',
                                backend: {
                                    serviceName: 'legend-studio-service',
                                    servicePort: 80,
                                }
                            }],
                        }
                    },
                ]
            }
        })


        new k8s.Ingress(this, "GitlabIngress", {
            metadata: {
                name: 'gitlab-ingress',
                annotations: {
                    'kubernetes.io/ingress.class': 'alb',
                    'alb.ingress.kubernetes.io/listen-ports': '[{"HTTPS":443}]',
                    'alb.ingress.kubernetes.io/scheme': 'internet-facing',
                    'alb.ingress.kubernetes.io/backend-protocol': 'HTTPS',
                    'alb.ingress.kubernetes.io/success-codes': '200,201,302',
                },
            },
            spec: {
                rules: [
                    {
                        host: `gitlab.${props.legendDomain}`,
                        http: {
                            paths: [{
                                path: '/*',
                                backend: {
                                    serviceName: 'gitlab-ce-service',
                                    servicePort: 443,
                                }
                            }],
                        }
                    },
                ]
            }
        })
    }
}