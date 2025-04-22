import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import { type IStackConfig } from './config';
import { Construct } from 'constructs';

interface DatabaseStackProps extends cdk.NestedStackProps {
  config: IStackConfig;
  vpc: ec2.IVpc;
  bastionHost: ec2.IInstance;
  bastionRole: iam.IRole;
}

export class DatabaseStack extends cdk.NestedStack {
  public readonly cluster: rds.DatabaseCluster;
  
  constructor(scope: Construct, id: string, props: DatabaseStackProps) {
    super(scope, id, props);

    const databaseKey = new kms.Key(this, 'DatabaseKey', {
      enableKeyRotation: true,
      description: 'KMS key for database encryption',
      alias: `${props.config.environmentName}-database-key`
    });

    this.cluster = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_6,
      }),
      vpc: props.vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      readers: [
        rds.ClusterInstance.serverlessV2('Reader1')
      ],
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 1,
      defaultDatabaseName: 'parkrun',
      enableDataApi: true,
      iamAuthentication: true,
      enablePerformanceInsights: true,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT, // 7 days
      performanceInsightEncryptionKey: databaseKey,
      enableClusterLevelEnhancedMonitoring: true,
      monitoringInterval: cdk.Duration.seconds(60),
      storageEncryptionKey: databaseKey,
      storageEncrypted: true,
    });

    // Grant access to bastion
    this.cluster.connections.allowFrom(
      props.bastionHost,
      ec2.Port.tcp(5432),
      'Allow access from bastion host'
    );

    // Outputs
    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: this.cluster.clusterEndpoint.hostname,
      description: 'Cluster endpoint',
      exportName: `${props.config.environmentName}-cluster-endpoint`
    });

    new cdk.CfnOutput(this, 'SecretArn', {
      value: this.cluster.secret?.secretArn || '',
      description: 'Database credentials secret ARN',
      exportName: `${props.config.environmentName}-db-secret-arn`
    });

    new cdk.CfnOutput(this, 'DatabaseKMSKeyArn', {
      value: databaseKey.keyArn,
      description: 'Database KMS Key ARN',
      exportName: `${props.config.environmentName}-db-kms-key-arn`
    });
  }
}
