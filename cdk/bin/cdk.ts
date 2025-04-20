import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../lib/infrastructure';
import { DatabaseStack } from '../lib/database';
import { BackendStack } from '../lib/backend';
import { WAFStack } from '../lib/waf';
//import { FrontendStack } from '../lib/frontend';
import { getConfig } from '../lib/config';

const app = new cdk.App();
const environment = process.env.ENVIRONMENT || 'dev';
const config = getConfig(app, environment);

// Create stacks

const waf = new WAFStack(app, 'ParkRunWAF', { 
  config 
});

const infra = new InfrastructureStack(app, 'InfrastructureStack', { 
  config
});

const database = new DatabaseStack(app, 'DatabaseStack', {
  config,
  vpc: infra.vpc,
  bastionHost: infra.bastionHost,
});

const backend = new BackendStack(app, 'BackendStack', {
  config,
  vpc: infra.vpc,
  cluster: database.cluster,
  webAcl: waf.apiGatewayWebAcl
});

//const frontend = new FrontendStack(app, 'FrontendStack', { 
//  config,
//  webAcl: waf.cloudFrontWebAcl 
// });


 //infra.addDependency(waf);
//database.addDependency(infra);
//backend.addDependency(database);
//frontend.addDependency(waf);

// Tagging
const stacks = [infra, database, backend, waf];
stacks.forEach(stack => {
  cdk.Tags.of(stack).add('Project', 'ParkRun');
  cdk.Tags.of(stack).add('Environment', config.environmentName);
});
