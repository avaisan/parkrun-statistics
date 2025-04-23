import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { type IStackConfig } from './config';
import { InfrastructureStack } from './infrastructure';
import { DatabaseStack } from './database';
import { BackendStack } from './backend';

export interface BaseStackProps extends cdk.StackProps {
  config: IStackConfig;
  apiWebAcl: wafv2.CfnWebACL;
  cloudFrontWebAcl: wafv2.CfnWebACL;
}

export class BaseStack extends cdk.Stack {
    public readonly infrastructureStack: InfrastructureStack;
    public readonly databaseStack: DatabaseStack;
    public readonly backendStack: BackendStack;
  
    constructor(scope: cdk.App, id: string, props: BaseStackProps) {
      super(scope, id, props);
  
      // 1. Create infrastructure stack
      this.infrastructureStack = new InfrastructureStack(this, 'InfrastructureStack', {
        config: props.config
      });
  
      // 2. Create database stack
      this.databaseStack = new DatabaseStack(this, 'DatabaseStack', {
        config: props.config,
        vpc: this.infrastructureStack.vpc,
        bastionHost: this.infrastructureStack.bastionHost,
        bastionRole: this.infrastructureStack.bastionRole
      });
  
      // 3. Create backend stack
      this.backendStack = new BackendStack(this, 'BackendStack', {
        config: props.config,
        vpc: this.infrastructureStack.vpc,
        cluster: this.databaseStack.cluster,
        webAcl: props.apiWebAcl
      });
  
      this.databaseStack.addDependency(this.infrastructureStack);
      this.backendStack.addDependency(this.databaseStack);
    }
  }
  