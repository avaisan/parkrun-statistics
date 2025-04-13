// cdk/lib/database.ts
import * as cdk from 'aws-cdk-lib';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class DatabaseStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'ParkrunVPC');

    const cluster = new rds.ServerlessCluster(this, 'ParkrunDB', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_15_3,
      }),
      vpc,
      scaling: {
        autoPause: cdk.Duration.minutes(10),
        minCapacity: rds.AuroraCapacityUnit.ACU_2,
        maxCapacity: rds.AuroraCapacityUnit.ACU_4,
      },
      defaultDatabaseName: 'parkrun',
    });
  }
}