import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as logs from 'aws-cdk-lib/aws-logs';

export class CloudFrontWAFStack extends cdk.Stack {
  public readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      env: { region: 'us-east-1' }  // CloudFront WAF must be in us-east-1
    });

    this.webAcl = new wafv2.CfnWebACL(this, 'CloudFrontWebACL', {
      defaultAction: { allow: {} },
      scope: 'CLOUDFRONT',
      name: 'parkrun-cloudfront-waf',
      description: 'WAF Web ACL for CloudFront distribution',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'CloudFrontWebACLMetrics',
        sampledRequestsEnabled: true,
      },
      rules: getWafRules()
    });

    const logGroup = new logs.LogGroup(this, 'CloudFrontWAFLogs', {
      logGroupName: 'aws-waf-logs-cloudfront',
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    new wafv2.CfnLoggingConfiguration(this, 'CloudFrontWAFLogging', {
      logDestinationConfigs: [logGroup.logGroupArn],
      resourceArn: this.webAcl.attrArn
    });
  }
}

function getWafRules(): wafv2.CfnWebACL.RuleProperty[] {
  return [
    // AWS Managed Rules - Core Rule Set
    {
      name: 'AWSManagedRulesCommonRuleSet',
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
        metricName: 'AWSManagedRulesCommonRuleSetMetrics',
        sampledRequestsEnabled: true,
      }
    },

    // Known Bad Inputs
    {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
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
        metricName: 'AWSManagedRulesKnownBadInputsRuleSetMetrics',
        sampledRequestsEnabled: true,
      }
    },

    // Rate Limiting Rule
    {
      name: 'RateLimitRule',
      priority: 30,
      action: { block: {} },
      statement: {
        rateBasedStatement: {
          aggregateKeyType: 'IP',
          limit: 2000
        }
      },
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'RateLimitRuleMetrics',
        sampledRequestsEnabled: true,
      }
    },

    // Geo-blocking Rule - Allow Nordic Countries
    {
      name: 'GeoBlockRule',
      priority: 40,
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
    }
  ];
}
