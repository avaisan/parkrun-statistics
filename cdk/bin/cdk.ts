#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ParkRunStack } from '../lib/infrastructure';

const app = new cdk.App();

const accountId = process.env.AWS_ACCOUNT_ID || app.node.tryGetContext('accountId');
const hostedZoneId = process.env.HOSTED_ZONE_ID || app.node.tryGetContext('hostedZoneId');
const domainName = process.env.DOMAIN_NAME || app.node.tryGetContext('domainName');

new ParkRunStack(app, 'ParkRunStack', {
  env: { 
    region: 'eu-central-1',
    account: accountId
  },
  domainName,
  hostedZoneId
});
