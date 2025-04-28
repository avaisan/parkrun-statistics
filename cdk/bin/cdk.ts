#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ParkRunStack } from '../lib/infrastructure';

const app = new cdk.App();

const accountId = process.env.AWS_ACCOUNT_ID || app.node.tryGetContext('accountId');
const hostedZoneId = process.env.HOSTED_ZONE_ID || app.node.tryGetContext('hostedZoneId');
const domainName = process.env.DOMAIN_NAME || app.node.tryGetContext('domainName');
const environments = app.node.tryGetContext('environments');

const targetEnv = process.env.TARGET_ENV || 'prod';
const envConfig = environments[targetEnv];

if (!envConfig) {
  throw new Error(`Environment ${targetEnv} not found in configuration`);
}

new ParkRunStack(app, `ParkRunStack-${targetEnv}`, {
  stackName: `parkrun-stack-${targetEnv}`,
  env: { 
    region: envConfig.region,
    account: accountId
  },
  domainName,
  hostedZoneId,
  environmentName: envConfig.environmentName,
  subdomain: envConfig.subdomain,
  tags: {
    Environment: envConfig.environmentName
  }
});
