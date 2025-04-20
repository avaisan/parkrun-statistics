import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { type IStackConfig } from './config';

interface DatabaseStackProps extends cdk.StackProps {
  config: IStackConfig;
  vpc: ec2.Vpc;
  bastionHost: ec2.Instance;
}

export class DatabaseStack extends cdk.Stack {
  public readonly cluster: rds.DatabaseCluster;
  
  constructor(scope: cdk.App, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    // Aurora PostgreSQL serverlessV2 database cluster
    this.cluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_17_2,
      }),
      instanceProps: {
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM),
        vpc: props.vpc,
      },
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 1,
      defaultDatabaseName: 'parkrun',
      enableDataApi: true,
      iamAuthentication: true,
      enableClusterLevelEnhancedMonitoring: true,
      monitoringInterval: cdk.Duration.seconds(60)
    });

    // Grant access to bastion
    this.cluster.connections.allowFrom(
      props.bastionHost,
      ec2.Port.tcp(5432),
      'Allow access from bastion host'
    );

    // Grant bastion host IAM permissions to connect as master user
    props.bastionHost.role?.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['rds-db:connect'],
        resources: [`arn:aws:rds-db:${this.region}:${this.account}:dbuser:${this.cluster.clusterIdentifier}/*`]
      })
    );

    // Outputs
    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
      description: 'Cluster endpoint',
    });

    new cdk.CfnOutput(this, 'SecretArn', {
      value: this.cluster.secret?.secretArn || '',
      description: 'Database credentials secret ARN',
    });
  }
}
