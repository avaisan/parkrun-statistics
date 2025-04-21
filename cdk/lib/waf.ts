import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { type IStackConfig } from './config';

interface WAFStackProps extends cdk.StackProps {
  config: IStackConfig;
}

export class CloudFrontWAFStack extends cdk.Stack {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: cdk.App, id: string, props: WAFStackProps) {
    super(scope, id, {
      ...props,
      env: {
        account: props.config.env.account,
        region: 'us-east-1' // CloudFront WAF must be in us-east-1
      }
    });

    this.webAcl = new wafv2.CfnWebACL(this, 'CloudFrontWebACL', {
      defaultAction: { allow: {} },
      scope: 'CLOUDFRONT',
      name: `parkrun-cloudfront-waf-${props.config.environmentName}`,
      description: 'WAF Web ACL for CloudFront distribution',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'CloudFrontWebACLMetrics',
        sampledRequestsEnabled: true,
      },
      rules: getWafRules('CloudFront')
    });

    const logGroup = new logs.LogGroup(this, 'CloudFrontWAFLogs', {
      logGroupName: `aws-waf-logs-cloudfront-${props.config.environmentName}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new wafv2.CfnLoggingConfiguration(this, 'CloudFrontWAFLogging', {
      logDestinationConfigs: [logGroup.logGroupArn],
      resourceArn: this.webAcl.attrArn
    });
  }
}

export class ApiGatewayWAFStack extends cdk.Stack {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: cdk.App, id: string, props: WAFStackProps) {
    super(scope, id, props);

    this.webAcl = new wafv2.CfnWebACL(this, 'ApiGatewayWebACL', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      name: `parkrun-api-waf-${props.config.environmentName}`,
      description: 'WAF Web ACL for API Gateway',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'ApiGatewayWebACLMetrics',
        sampledRequestsEnabled: true,
      },
      rules: getWafRules('ApiGateway')
    });

    const logGroup = new logs.LogGroup(this, 'ApiGatewayWAFLogs', {
      logGroupName: `aws-waf-logs-regional-${props.config.environmentName}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Enable logging for API Gateway WAF
    new wafv2.CfnLoggingConfiguration(this, 'ApiGatewayWAFLogging', {
      logDestinationConfigs: [logGroup.logGroupArn],
      resourceArn: this.webAcl.attrArn
    });
  }
}

function getWafRules(type: 'CloudFront' | 'ApiGateway'): wafv2.CfnWebACL.RuleProperty[] {
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
