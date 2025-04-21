import * as cdk from 'aws-cdk-lib';
import { type IStackConfig } from './config';
import { InfrastructureStack } from './infrastructure';
import { DatabaseStack } from './database';

export interface BaseStackProps extends cdk.StackProps {
  config: IStackConfig;
}

export class BaseStack extends cdk.Stack {
  public readonly infrastructureStack: InfrastructureStack;
  public readonly databaseStack: DatabaseStack;

  constructor(scope: cdk.App, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // Create infrastructure stack first
    this.infrastructureStack = new InfrastructureStack(this, 'InfrastructureStack', {
      config: props.config
    });

    // Create database stack with infrastructure dependencies
    this.databaseStack = new DatabaseStack(this, 'DatabaseStack', {
      config: props.config,
      vpc: this.infrastructureStack.vpc,
      bastionHost: this.infrastructureStack.bastionHost,
      bastionRole: this.infrastructureStack.bastionRole
    });

    // Explicitly add dependency
    this.databaseStack.addDependency(this.infrastructureStack);
  }
}
