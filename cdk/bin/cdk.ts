import * as cdk from 'aws-cdk-lib';
import { getConfig } from '../lib/config';
import { BaseStack } from '../lib/base';
import { CloudFrontWAFStack, ApiGatewayWAFStack } from '../lib/waf';
//import { BackendStack } from '../lib/backend';
//import { FrontendStack } from '../lib/frontend';


const app = new cdk.App();
const environment = process.env.ENVIRONMENT ?? 'dev';
const config = getConfig(app, environment);

const base = new BaseStack(app, `BaseStack`, {
  config
});

const cfwaf = new CloudFrontWAFStack(app, 'CloudFrontWAFStack', { 
  config 
});

const agwwaf = new ApiGatewayWAFStack(app, 'ApiGatewayWAFStack', { 
  config 
});

//const database = new DatabaseStack(base, 'DatabaseStack', {
//  config,
//  vpc: infra.vpc,
//  bastionHost: infra.bastionHost,
//  bastionRole: infra.bastionRole
//});

//const backend = new BackendStack(app, 'BackendStack', {
//  config,
//  vpc: infra.vpc,
//  cluster: database.cluster,
//  webAcl: waf.apiGatewayWebAcl
//});

//const frontend = new FrontendStack(app, 'FrontendStack', { 
//  config,
//  webAcl: waf.cloudFrontWebAcl 
// });

cfwaf.addDependency(base);
agwwaf.addDependency(base);
//database.addDependency(infra);
//backend.addDependency(database);
//frontend.addDependency(waf);

// Tagging
[base, cfwaf, agwwaf].forEach(stack => {
  cdk.Tags.of(stack).add('Project', 'ParkRun');
  cdk.Tags.of(stack).add('Environment', config.environmentName);
});
