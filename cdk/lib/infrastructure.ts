import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { type IStackConfig } from './config';

interface InfrastructureStackProps extends cdk.StackProps {
  config: IStackConfig;
}

export class InfrastructureStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly apiRepository: ecr.Repository;
  public readonly bastionHost: ec2.Instance;
  
  constructor(scope: cdk.App, id: string, props: InfrastructureStackProps) {
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
    });


 

    
    // Bastion host role with permissions for IAM database authentication
    const bastionRole = new iam.Role(this, 'BastionRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        ],
        inlinePolicies: {
          'DatabaseAccess': new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: [
                  'rds-db:connect'
                ],
                resources: [
                  `arn:aws:rds-db:${this.region}:${this.account}:dbuser:*/*`
                ]
              })
            ]
          })
        }
    });

      // Bastion host
    this.bastionHost = new ec2.Instance(this, 'BastionHost', {
        vpc: this.vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
        machineImage: new ec2.AmazonLinuxImage({
          generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2023,
        }),
        role: bastionRole,
      });
    }

    
    }
