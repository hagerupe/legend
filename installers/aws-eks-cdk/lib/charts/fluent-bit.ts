import * as constructs from 'constructs';
import * as cdk8s from 'cdk8s';
import {ConfigMap} from "cdk8s-plus";
import * as fs from "fs";
import * as path from "path";

export interface FluentBitChartProps {

}

export class FluentBitChart extends cdk8s.Chart {
    constructor(scope: constructs.Construct, id: string, props: FluentBitChartProps) {
        super(scope, id);

        // TODO make region configurable on configuration
        const encode = (str: string):string => Buffer.from(str, 'binary').toString('base64');
        new ConfigMap(this, "fluentbit-config", {
            metadata: {
                name: 'fluentbit-config'
            },
            binaryData: {
                'fluent-bit.conf': encode(fs.readFileSync(path.join('resources', 'fluentbit', 'fluent-bit.conf'), {encoding: 'utf8'})),
            }
        })

    }
}