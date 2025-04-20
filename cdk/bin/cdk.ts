import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure';
import { DatabaseStack } from '../lib/database';
import { BackendStack } from '../lib/backend';
import { FrontendStack } from '../lib/frontend';
import { getConfig } from '../lib/config';

const app = new cdk.App();
const environment = process.env.ENVIRONMENT || 'dev';
const config = getConfig(app, environment);

// Create stacks
const infra = new InfrastructureStack(app, 'ParkRunInfra', { config });
const database = new DatabaseStack(app, 'ParkRunDatabase', {
  config,
  vpc: infra.vpc,
  bastionHost: infra.bastionHost,
});
const backend = new BackendStack(app, 'ParkRunBackend', {
  config,
  vpc: infra.vpc,
  cluster: database.cluster,
  webAcl: infra.apiGatewayWebAcl  // Add WAF reference
});

const frontend = new FrontendStack(app, 'ParkRunFrontend', {
  config,
  webAcl: infra.cloudFrontWebAcl  // Using CloudFront WAF
});

database.addDependency(infra);
backend.addDependency(database);
frontend.addDependency(infra);

// Tagging
const stacks = [infra, database, backend, frontend];
stacks.forEach(stack => {
  cdk.Tags.of(stack).add('Project', 'ParkRun');
  cdk.Tags.of(stack).add('Environment', config.environmentName);
});
