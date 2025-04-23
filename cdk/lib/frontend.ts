import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { type IStackConfig } from './config';

interface FrontendStackProps extends cdk.StackProps {
  config: IStackConfig;
  webAcl: wafv2.CfnWebACL;
  apiUrl: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: FrontendStackProps) {
    super(scope, id, props);


    // S3 bucket for static website hosting
    const bucketname = `parkrunstats-${props.config.environmentName}-website`;
    const websiteBucket = new s3.Bucket(this, bucketname, {
      bucketName: bucketname,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: false,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // Create S3 bucket origin with OAC
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(websiteBucket, {
      originAccessLevels: [cloudfront.AccessLevel.READ],
      originPath: ''
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'distribution', {
      defaultBehavior: { 
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        compress: true,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
      },
    webAclId: props.webAcl.attrArn,  
    defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/404.html',
          ttl: cdk.Duration.minutes(0)
        },
        {
          httpStatus: 500,
          responseHttpStatus: 200,
          responsePagePath: '/500.html',
          ttl: cdk.Duration.minutes(0)
        },
      ],
      enabled: true
    });

    // Update bucket policy to only allow access from CloudFront
    websiteBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [websiteBucket.arnForObjects('*')],
      principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      conditions: {
        StringEquals: {
          'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`
        }
      }
    }));

    // Outputs
    new cdk.CfnOutput(this, 'BucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 bucket name',
      exportName: `${props.config.environmentName}-website-bucket-name`,
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
      exportName: `${props.config.environmentName}-distribution-domain`,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
      exportName: `${props.config.environmentName}-distribution-id`,
    });

    // Tagging
    cdk.Tags.of(websiteBucket).add('Environment', props.config.environmentName);
    cdk.Tags.of(distribution).add('Environment', props.config.environmentName);
  }
}
