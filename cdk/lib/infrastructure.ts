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
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
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

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const apiFunction = new lambda.Function(this, 'ParkRunApiFunction', {
      functionName: `parkrun-api-${props.environmentName}`,
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../api'), {
        bundling: {
          image: lambda.Runtime.NODEJS_22_X.bundlingImage,
          command: [
            'bash', '-c', [
              'mkdir -p /tmp/build',
              'cp -r /asset-input/* /tmp/build',
              'cd /tmp/build',
              'npm install --no-fund --no-audit',
              'npm run build',
              'echo \'{"type":"module"}\' > /asset-output/package.json',
              'cp -r dist/* /asset-output/'
            ].join(' && ')
          ],
          user: 'root'
        }
      }),
      environment: {
        NODE_ENV: props.environmentName,
        WEBSITE_BUCKET_NAME: websiteBucket.bucketName,
        STATS_FILE_PATH: 'data/parkrun-data.json',
        DATE_FILE_PATH: 'data/latest_date.json',
        NODE_OPTIONS: '--experimental-specifier-resolution=node'
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
