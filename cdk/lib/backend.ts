import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { type IStackConfig } from './config';
import { Construct } from 'constructs';

interface BackendStackProps extends cdk.NestedStackProps {
  config: IStackConfig;
  vpc: ec2.Vpc;
  cluster: rds.DatabaseCluster;
  webAcl: wafv2.CfnWebACL;
  apiRepository: ecr.IRepository;
}

export class BackendStack extends cdk.NestedStack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);

    // Lambda role for API handler with DB access via Data API
    const lambdaRole = new iam.Role(this, 'ApiHandlerRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ]
    });

    // Add RDS connect permission to role
    lambdaRole.addToPolicy(new iam.PolicyStatement({
      actions: ['rds-db:connect'],
      resources: [`arn:aws:rds-db:${this.region}:${this.account}:dbuser:${props.cluster.clusterIdentifier}/readonly`]
    }));
    props.cluster.grantDataApiAccess(lambdaRole);
    
    // API Lambda, to be deployed as a container image from ECR
    const apiHandler = new lambda.CfnFunction(this, 'ApiHandler', {
      packageType: 'Image',
      code: {
        imageUri: `${props.apiRepository.repositoryUri}:base`  // Use public ECR image as placeholder
      },
      role: lambdaRole.roleArn,
      architectures: ['arm64'],
      vpcConfig: {
        securityGroupIds: [props.vpc.vpcDefaultSecurityGroup],
        subnetIds: props.vpc.selectSubnets({ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }).subnetIds
      },
      timeout: 30,
      memorySize: 1024,
      environment: {
        variables: {
          CLUSTER_ARN: props.cluster.clusterArn,
          SECRET_ARN: props.cluster.secret?.secretArn ?? '',
          DATABASE_NAME: 'parkrun',
          NODE_ENV: props.config.environmentName
        }
      }
    });

    // Create a Function from the CfnFunction for use with API Gateway
    const apiHandlerFunction = lambda.Function.fromFunctionAttributes(this, 'ApiHandlerFunction', {
      functionArn: apiHandler.attrArn,
      role: lambdaRole,
      sameEnvironment: true
    });

    // REST API Gateway
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `parkrun-api-${props.config.environmentName}`,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET'],
      },
    });

    // Associate regional WAF Web ACL with API Gateway stage
    new wafv2.CfnWebACLAssociation(this, 'ApiGatewayWAFAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${this.api.restApiId}/stages/${this.api.deploymentStage.stageName}`,
      webAclArn: props.webAcl.attrArn
    });

    // API routes
    const stats = this.api.root.addResource('stats');
    stats.addMethod('GET', new apigateway.LambdaIntegration(apiHandlerFunction));

    const health = this.api.root.addResource('health');
    health.addMethod('GET', new apigateway.LambdaIntegration(apiHandlerFunction));

    const latestdate = this.api.root.addResource('latest-date');
    latestdate.addMethod('GET', new apigateway.LambdaIntegration(apiHandlerFunction));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
    });
  }
}