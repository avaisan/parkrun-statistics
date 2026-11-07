import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { addParkRunStacks, IEnvironmentConfig } from '../lib/app';

// Same context as `cdk synth` (environments + feature flags from cdk.json)
const cdkJson = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../cdk.json', import.meta.url)), 'utf8'));

function synth(targetEnv: 'dev' | 'prod'): { certificate: Template; main: Template; certificateRegion: string } {
  const app = new cdk.App({ context: cdkJson.context });
  const envConfig: IEnvironmentConfig = cdkJson.context.environments[targetEnv];
  const { certificateStack, mainStack } = addParkRunStacks(app, {
    targetEnv,
    envConfig,
    accountId: '123456789012',
    hostedZoneId: 'Z0000000000000',
    domainName: 'example.com'
  });
  return {
    certificate: Template.fromStack(certificateStack),
    main: Template.fromStack(mainStack),
    certificateRegion: certificateStack.region
  };
}

describe('CDK app', () => {
  const dev = synth('dev');

  it('Given the dev environment, When synthesizing, Then should create a DNS-validated certificate in us-east-1 for the dev domain', () => {
    expect(dev.certificateRegion).toBe('us-east-1');
    dev.certificate.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'parkrun-dev.example.com',
      ValidationMethod: 'DNS',
      DomainValidationOptions: [{ DomainName: 'parkrun-dev.example.com', HostedZoneId: 'Z0000000000000' }]
    });
  });

  it('Given the certificate stack, When synthesizing the main stack, Then should read the certificate via a cross-region export instead of the deprecated DnsValidatedCertificate', () => {
    dev.main.resourceCountIs('AWS::CloudFormation::CustomResource', 0);
    dev.main.resourceCountIs('Custom::CrossRegionExportReader', 1);
    dev.main.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['parkrun-dev.example.com'],
        ViewerCertificate: Match.objectLike({
          AcmCertificateArn: { 'Fn::GetAtt': [Match.stringLikeRegexp('^ExportsReader'), Match.anyValue()] }
        })
      })
    });
  });

  it('Given the website bucket, When synthesizing, Then CloudFront should use Origin Access Control and serve /404.html for 403 and 404', () => {
    dev.main.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
    dev.main.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);
    dev.main.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        CustomErrorResponses: Match.arrayWith([
          Match.objectLike({ ErrorCode: 403, ResponsePagePath: '/404.html' }),
          Match.objectLike({ ErrorCode: 404, ResponsePagePath: '/404.html' })
        ])
      })
    });
  });

  it('Given the API Lambda, When synthesizing, Then should run Node 24 with the site origin for CORS and a 30-day log group', () => {
    dev.main.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'parkrun-api-dev',
      Runtime: 'nodejs24.x',
      Environment: { Variables: Match.objectLike({ ALLOWED_ORIGIN: 'https://parkrun-dev.example.com' }) },
      LoggingConfig: Match.objectLike({ LogGroup: Match.anyValue() })
    });
    dev.main.hasResourceProperties('AWS::Logs::LogGroup', { LogGroupName: '/parkrun/api-dev', RetentionInDays: 30 });
  });

  it('Given the feature flags in cdk.json, When synthesizing, Then the API Gateway CloudWatch account role should not be created', () => {
    dev.main.resourceCountIs('AWS::ApiGateway::Account', 0);
  });

  it('Given the prod environment, When synthesizing, Then should use the prod domain for the certificate and the distribution', () => {
    const prod = synth('prod');

    prod.certificate.hasResourceProperties('AWS::CertificateManager::Certificate', { DomainName: 'parkrun.example.com' });
    prod.main.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({ Aliases: ['parkrun.example.com'] })
    });
  });
});
