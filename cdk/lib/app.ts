import * as cdk from 'aws-cdk-lib';
import { ParkRunStack } from './infrastructure';
import { ParkRunCertificateStack } from './certificate';

/** One entry of the `environments` context in cdk.json. */
export interface IEnvironmentConfig {
  region: string;
  environmentName: string;
  subdomain: string;
}

export interface IParkRunAppConfig {
  targetEnv: string;
  envConfig: IEnvironmentConfig;
  accountId: string;
  hostedZoneId: string;
  domainName: string;
}

export interface IParkRunStacks {
  certificateStack: ParkRunCertificateStack;
  mainStack: ParkRunStack;
}

/**
 * Adds the stacks of one environment to the app:
 * - `parkrun-certificate-<env>` in us-east-1 (CloudFront only accepts certificates from there)
 * - `parkrun-stack-<env>` in the environment's region, using that certificate via cross-region references
 */
export function addParkRunStacks(app: cdk.App, config: IParkRunAppConfig): IParkRunStacks {
  const { targetEnv, envConfig, accountId, hostedZoneId, domainName } = config;
  const tags = { Environment: envConfig.environmentName };

  const certificateStack = new ParkRunCertificateStack(app, `ParkRunCertificateStack-${targetEnv}`, {
    stackName: `parkrun-certificate-${targetEnv}`,
    env: { region: 'us-east-1', account: accountId },
    crossRegionReferences: true,
    domainName,
    hostedZoneId,
    subdomain: envConfig.subdomain,
    tags
  });

  const mainStack = new ParkRunStack(app, `ParkRunStack-${targetEnv}`, {
    stackName: `parkrun-stack-${targetEnv}`,
    env: { region: envConfig.region, account: accountId },
    crossRegionReferences: true,
    domainName,
    hostedZoneId,
    environmentName: envConfig.environmentName,
    subdomain: envConfig.subdomain,
    certificate: certificateStack.certificate,
    tags
  });

  return { certificateStack, mainStack };
}
