import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { type IStackConfig } from './config';

interface IWAFStackProps extends cdk.StackProps {
    config: IStackConfig;
  }

export class WAFStack extends cdk.Stack {
    public readonly cloudFrontWebAcl: wafv2.CfnWebACL;
    public readonly apiGatewayWebAcl: wafv2.CfnWebACL;
  
    constructor(scope: cdk.App, id: string, props: IWAFStackProps) {
        super(scope, id, props);
      
      // Move WAF creation logic here
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