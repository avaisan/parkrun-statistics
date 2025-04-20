import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { type IStackConfig } from './config';

interface BackendStackProps extends cdk.StackProps {
  config: IStackConfig;
  vpc: ec2.Vpc;
  cluster: rds.DatabaseCluster;
  webAcl: wafv2.CfnWebACL;
}

export class BackendStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: cdk.App, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // API Lambda
    const apiHandler = new lambda.DockerImageFunction(this, 'ApiHandler', {
      code: lambda.DockerImageCode.fromImageAsset('../backend', {
        file: 'Dockerfile.api'
      }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      timeout: cdk.Duration.seconds(30),
      memorySize: 1024,
      environment: {
        CLUSTER_ARN: props.cluster.clusterArn,
        SECRET_ARN: props.cluster.secret?.secretArn || '',
        DATABASE_NAME: 'parkrun',
        NODE_ENV: props.config.environmentName
      },
    });

    // Grant Data API access with read-only role
    apiHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['rds-db:connect'],
      resources: [`arn:aws:rds-db:${this.region}:${this.account}:dbuser:${props.cluster.clusterIdentifier}/readonly`]
    }));

    props.cluster.grantDataApiAccess(apiHandler);

    // API Gateway
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `parkrun-api-${props.config.environmentName}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET'],
      },
    });

    // Associate WAF with API Gateway stage
    new wafv2.CfnWebACLAssociation(this, 'ApiGatewayWAFAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${this.api.restApiId}/stages/${this.api.deploymentStage.stageName}`,
      webAclArn: props.webAcl.attrArn
    });

    // API routes
    const stats = this.api.root.addResource('stats');
    stats.addMethod('GET', new apigateway.LambdaIntegration(apiHandler));

    const health = this.api.root.addResource('health');
    health.addMethod('GET', new apigateway.LambdaIntegration(apiHandler));

    const latestdate = this.api.root.addResource('latest-date');
    latestdate.addMethod('GET', new apigateway.LambdaIntegration(apiHandler));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
    });
  }
}