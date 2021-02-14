import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import {KubernetesInfraStage} from "../lib/kubernetes-infra-stage";

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new KubernetesInfraStage(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
