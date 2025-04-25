#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ParkrunStack } from '../lib/infrastructure';
import { CloudFrontWAFStack } from '../lib/waf';

const app = new cdk.App();

const wafStack = new CloudFrontWAFStack(app, 'WAFStack');


new ParkrunStack(app, 'ParkRunStats', {
  env: { region: 'eu-central-1' },
  webAclId: wafStack.webAcl.attrArn
});
