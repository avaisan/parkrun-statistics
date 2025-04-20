import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { type IStackConfig } from './config';

interface InfrastructureStackProps extends cdk.StackProps {
  config: IStackConfig;
}

export class InfrastructureStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly apiRepository: ecr.Repository;
  public readonly cloudFrontWebAcl: wafv2.CfnWebACL;
  public readonly apiGatewayWebAcl: wafv2.CfnWebACL;
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


    // WAF for CloudFront (Global)
    this.cloudFrontWebAcl = new wafv2.CfnWebACL(this, 'CloudFrontWebACL', {
      defaultAction: { allow: {} },
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'CloudFrontWebACLMetrics',
        sampledRequestsEnabled: true,
      },
      rules: this.getWafRules('CloudFront')
    });

    // WAF for API Gateway (Regional)
    this.apiGatewayWebAcl = new wafv2.CfnWebACL(this, 'ApiGatewayWebACL', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'ApiGatewayWebACLMetrics',
        sampledRequestsEnabled: true,
      },
      rules: this.getWafRules('ApiGateway')
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

    private getWafRules(type: 'CloudFront' | 'ApiGateway'): wafv2.CfnWebACL.RuleProperty[] {
        const rules: wafv2.CfnWebACL.RuleProperty[] = [
          // AWS Managed Rules - Core Rule Set
          {
            name: `${type}AWSManagedRulesCommonRuleSet`,
            priority: 10,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                name: 'AWSManagedRulesCommonRuleSet',
                vendorName: 'AWS'
              }
            },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: `${type}AWSManagedRulesCommonRuleSetMetrics`,
              sampledRequestsEnabled: true,
            }
          },
    
          // Known Bad Inputs
          {
            name: `${type}AWSManagedRulesKnownBadInputsRuleSet`,
            priority: 20,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                name: 'AWSManagedRulesKnownBadInputsRuleSet',
                vendorName: 'AWS'
              }
            },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: `${type}AWSManagedRulesKnownBadInputsRuleSetMetrics`,
              sampledRequestsEnabled: true,
            }
          },
    
          // SQL Injection Protection
          {
            name: `${type}AWSManagedRulesSQLiRuleSet`,
            priority: 30,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                name: 'AWSManagedRulesSQLiRuleSet',
                vendorName: 'AWS'
              }
            },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: `${type}AWSManagedRulesSQLiRuleSetMetrics`,
              sampledRequestsEnabled: true,
            }
          },
    
          // Rate Limiting Rule
          {
            name: `${type}RateLimitRule`,
            priority: 40,
            action: { block: {} },
            statement: {
              rateBasedStatement: {
                aggregateKeyType: 'IP',
                limit: type === 'ApiGateway' ? 1000 : 2000
              }
            },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: `${type}RateLimitRuleMetrics`,
              sampledRequestsEnabled: true,
            }
          }
        ];
    
        // Add geo-blocking only for CloudFront
        if (type === 'CloudFront') {
          rules.push({
            name: 'GeoBlockRule',
            priority: 50,
            action: { allow: {} },
            statement: {
              geoMatchStatement: {
                countryCodes: ['FI', 'SE', 'NO', 'DK']
              }
            },
            visibilityConfig: {
              cloudWatchMetricsEnabled: true,
              metricName: 'GeoBlockRuleMetrics',
              sampledRequestsEnabled: true,
            }
          });
        }
    
        return rules;
      }
    }
