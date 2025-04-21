import * as cdk from 'aws-cdk-lib';
import { getConfig } from '../lib/config';
import { BaseStack } from '../lib/base';
import { FrontendStack } from '../lib/frontend';
import { CloudFrontWAFStack, ApiGatewayWAFStack } from '../lib/waf';


const app = new cdk.App();
const environment = process.env.ENVIRONMENT ?? 'dev';
const config = getConfig(app, environment);

const agwwaf = new ApiGatewayWAFStack(app, 'ApiGatewayWAFStack', { 
  config 
});

const cfwaf = new CloudFrontWAFStack(app, 'CloudFrontWAFStack', { 
  config 
});

const base = new BaseStack(app, `BaseStack`, {
  config,
  apiWebAcl: agwwaf.webAcl,
  cloudFrontWebAcl: cfwaf.webAcl
});

const frontend = new FrontendStack(app, `FrontendStack`, {
  env: {
    account: config.env.account,
    region: 'us-east-1'  // Frontend stack must be in us-east-1 for CloudFront
  },
  config,
  webAcl: cfwaf.webAcl,
  apiUrl: base.backendStack.api.url
});


base.addDependency(agwwaf);
base.addDependency(cfwaf);
frontend.addDependency(cfwaf);
frontend.addDependency(base);

// Tagging
[base, frontend, cfwaf, agwwaf].forEach(stack => {
  cdk.Tags.of(stack).add('Project', 'ParkRun');
  cdk.Tags.of(stack).add('Environment', config.environmentName);
});
