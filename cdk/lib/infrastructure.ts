import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

interface ParkRunStackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneId: string;
  environmentName: string;
  subdomain: string;
}

export class ParkRunStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ParkRunStackProps) {
    super(scope, id, props);

    const fullDomain = `${props.subdomain}.${props.domainName}`;

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.domainName
    });;

    const certificate = new acm.DnsValidatedCertificate(this, 'Certificate', {
      domainName: fullDomain,
      hostedZone: hostedZone,
      region: 'us-east-1',
    });;

    const websiteBucket = new s3.Bucket(this, 'XXXXXXXXXXXXX', {
      bucketName: `${props.subdomain}-${props.environmentName}-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.S3_MANAGED,
      autoDeleteObjects: true,
      enforceSSL: true
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI');
    websiteBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, { originAccessIdentity }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true
      },
      domainNames: [fullDomain],
      certificate: certificate,
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
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021
    });
    
    (distribution.node.defaultChild as cdk.CfnResource).cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.DELETE;

    new route53.ARecord(this, 'ParkRunRecord', {
      zone: hostedZone,
      recordName: props.subdomain,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      )
    });

    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: websiteBucket.bucketName,
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
    });

    new cdk.CfnOutput(this, 'DomainName', {
      value: fullDomain,
    });
  }
}
