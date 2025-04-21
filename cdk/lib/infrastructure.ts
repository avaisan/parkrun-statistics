import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import { type IStackConfig } from './config';
import { Construct } from 'constructs';

interface InfrastructureStackProps extends cdk.NestedStackProps {
  config: IStackConfig;
}

export class InfrastructureStack extends cdk.NestedStack {
  public readonly vpc: ec2.Vpc;
  public readonly apiRepository: ecr.Repository;
  public readonly bastionHost: ec2.Instance;
  public readonly bastionRole: iam.IRole;
  
  constructor(scope: Construct, id: string, props: InfrastructureStackProps) {
    super(scope, id, props);

    // VPC with private and public subnets
    this.vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

   // ECR Repository
   this.apiRepository = new ecr.Repository(this, 'ApiRepository', {
    repositoryName: `parkrun-api-${props.config.environmentName}`,
    removalPolicy: cdk.RemovalPolicy.RETAIN,
    lifecycleRules: [{
      maxImageCount: 5,
    }],
    imageScanOnPush: true
  });

  // Create custom resource to copy the base image
  const copyImageFunction = new lambda.Function(this, 'CopyImageFunction', {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler',
    code: lambda.Code.fromInline(`
      const AWS = require('aws-sdk');
      const ecr = new AWS.ECR();
      
      exports.handler = async (event) => {
        console.log('Event:', JSON.stringify(event, null, 2));
        
        if (event.RequestType === 'Create' || event.RequestType === 'Update') {
          try {
            const authData = await ecr.getAuthorizationToken().promise();
            console.log('Got ECR authorization');
            
            // Add your image copy logic here if needed
            
            return {
              PhysicalResourceId: 'base-image',
              Data: {
                Message: 'Base image copy initiated'
              }
            };
          } catch (error) {
            console.error('Error:', error);
            throw error;
          }
        }
        
        return {
          PhysicalResourceId: 'base-image'
        };
      };
    `),
  });

  // Grant ECR permissions to the function
  this.apiRepository.grantPullPush(copyImageFunction);

  // Create the custom resource provider
  const provider = new cr.Provider(this, 'CopyImageProvider', {
    onEventHandler: copyImageFunction,
  });

  // Create the custom resource
  new cdk.CustomResource(this, 'CopyBaseImage', {
    serviceToken: provider.serviceToken,
    properties: {
      SourceImage: 'public.ecr.aws/sam/nodejs22.x-base:latest-arm64',
      TargetRepository: this.apiRepository.repositoryUri,
      Tag: 'base'
    }
  });
    
    // Bastion host role with permissions for IAM database authentication
    this.bastionRole = new iam.Role(this, 'BastionRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
      ]
    });

    this.bastionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['rds-db:connect'],
        resources: [`arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/*`]
      })
    );

    // Create bastion host with the role
    this.bastionHost = new ec2.Instance(this, 'BastionHost', {
      vpc: this.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
      }),
      role: this.bastionRole,
      requireImdsv2: true,
      securityGroup: new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
        vpc: this.vpc,
        description: 'Security group for Bastion Host',
        allowAllOutbound: true,
      })
    });
  }
}
