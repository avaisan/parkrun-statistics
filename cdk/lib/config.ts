import * as cdk from 'aws-cdk-lib';

export interface IEnvironmentConfig {
    account: string;
    region: string;
    environmentName: string;
    domain: string;
  }
  
  export interface IStackConfig {
    env: {
      account: string;
      region: string;
    };
    environmentName: string;
    tags: {
      Environment: string;
      Project: string;
    };
  }
  
  export function getConfig(app: cdk.App, environment: string): IStackConfig {
    const envConfig: IEnvironmentConfig = app.node.tryGetContext('environments')[environment];
    
    if (!envConfig) {
      throw new Error(`Environment ${environment} not found in cdk.json`);
    }

 
    return {
      env: {
        account: process.env.AWS_ACCOUNT_ID ?? envConfig.account,
        region: envConfig.region,
      },
      environmentName: envConfig.environmentName,
      tags: {
        Environment: envConfig.environmentName,
        Project: 'ParkRun',
      },
    };
  }