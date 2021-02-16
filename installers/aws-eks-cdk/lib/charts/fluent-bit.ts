import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import {ConfigMap} from "cdk8s-plus";
import * as fs from "fs";
import * as path from "path";
import {Namespace} from "cdk8s-plus/lib/imports/k8s";

export interface FluentBitChartProps {

}

// https://aws.amazon.com/blogs/containers/fluent-bit-for-amazon-eks-on-aws-fargate-is-here/
export class FluentBitChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: FluentBitChartProps) {
        super(scope, id);

        // TODO make region configurable on configuration
        /*new cdk8s.ApiObject(this, 'fluentbit', {
            apiVersion: 'eksctl.io/v1alpha5',
            kind: 'ClusterConfig',
            metadata: {
                name: 'fluentbit',
                region: 'us-east-1',
                version: '1.18',
            },
            iam: {
                'withOIDC': true
            },
            fargateProfiles: [
                {
                    name: 'defaultfp',
                    selectors: [
                        {
                            namespace: 'default'
                        },
                        {
                            namespace: 'kube-system'
                        }
                    ]
                }
            ],
            cloudWatch: {
                clusterLogging: {
                    enableTypes: [ "*" ]
                }
            }
        })*/

        const namespace = new Namespace(this, 'aws-observability', {
            metadata: {
                name: 'aws-observability',
                labels: {
                    'aws-observability': 'enabled'
                }
            }
        })

        const encode = (str: string):string => Buffer.from(str, 'binary').toString('base64');
        const config = new ConfigMap(this, 'aws-logging', {
            metadata: {
                name: 'aws-logging',
                namespace: 'aws-observability'
            },
            data: {
                'output.conf': fs.readFileSync(path.join('resources', 'fluentbit', 'fluent-bit.conf'), {encoding: 'utf8'}),
            }
        })

        // TODO make region configurable on configuration
        /*new ConfigMap(this, "fluentbit-config", {
            metadata: {
                name: 'fluentbit-config'
            },
            binaryData: {
                'fluent-bit.conf': encode(fs.readFileSync(path.join('resources', 'fluentbit', 'fluent-bit.conf'), {encoding: 'utf8'})),
            }
        })*/

    }
}