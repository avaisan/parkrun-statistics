#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ParkRunStack } from '../lib/infrastructure';

const app = new cdk.App();

new ParkRunStack(app, 'ParkRunStack', {
  env: { region: 'eu-central-1' }
});
