import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface IParkRunStackProps extends cdk.StackProps {
  domainName: string;
  hostedZoneId: string;
  environmentName: string;
  subdomain: string;
}

export class ParkRunStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: IParkRunStackProps) {
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

    const dataBucket = new s3.Bucket(this, 'ParkRunDataBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true
    });

    const websiteBucket = new s3.Bucket(this, 'ParkRunBucket', {
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

    const apiFunction = new lambda.Function(this, 'ParkRunApiFunction', {
      functionName: `parkrun-api-${props.environmentName}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        export const handler = async (event) => {
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ message: 'Hello from Lambda!' })
          };
        };
      `),
      environment: {
        NODE_ENV: props.environmentName,
        DATA_BUCKET_NAME: dataBucket.bucketName,
        NODE_OPTIONS: '--experimental-modules --es-module-specifier-resolution=node'
      },
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
    });

    apiFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents'
      ],
      resources: ['*']
    }));

    dataBucket.grantRead(apiFunction);

    const api = new apigw.RestApi(this, 'ParkRunApi', {
      restApiName: `parkrun-api-${props.environmentName}`,
      description: 'API Gateway for ParkRun Statistics',
      defaultCorsPreflightOptions: {
        allowOrigins: [`https://${props.subdomain}.${props.domainName}`],
        allowMethods: ['GET'],
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key']
      },
    });

    const apiResource = api.root.addResource('api');

    const eventsIntegration = new apigw.LambdaIntegration(apiFunction);
    apiResource.addResource('events').addMethod('GET', eventsIntegration);
    apiResource.addResource('latest-date').addMethod('GET', eventsIntegration);
    apiResource.addResource('health').addMethod('GET', eventsIntegration);

    // Outputs
    new cdk.CfnOutput(this, 'DistributionDomain', {
      value: distribution.distributionDomainName,
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: websiteBucket.bucketName,
      description: 'S3 bucket for frontend files',
    });

    new cdk.CfnOutput(this, 'DataBucketName', {
      value: dataBucket.bucketName,
      description: 'S3 bucket for data files',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
    });

    new cdk.CfnOutput(this, 'DomainName', {
      value: fullDomain,
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: `ParkRunApiEndpoint-${props.environmentName}`
    });

    new cdk.CfnOutput(this, 'LambdaName', {
      value: apiFunction.functionName,
      description: 'Lambda function name',
      exportName: `ParkRunLambdaName-${props.environmentName}`
    });
  }
}
