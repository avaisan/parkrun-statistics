import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecr_assets from 'aws-cdk-lib/aws-ecr-assets';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';

export class BackendStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Docker image asset
    const apiImage = new ecr_assets.DockerImageAsset(this, 'ApiImage', {
      directory: '../backend', // Directory containing Dockerfile.api
      file: 'Dockerfile.api',
    });

    // API Lambda
    const apiHandler = new lambda.DockerImageFunction(this, 'ApiHandler', {
      code: lambda.DockerImageCode.fromAsset('../backend', {
      file: 'Dockerfile.api',
    }),
    timeout: cdk.Duration.seconds(30),
    environment: {
      DATABASE_URL: process.env.DATABASE_URL!,
    },
    memorySize: 1024, // Adjust based on your needs
  });

    // API Gateway
    const api = new apigateway.RestApi(this, 'ParkrunApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'], // Restrict in production
        allowMethods: ['GET'],
      },
    });

    api.root.addResource('stats')
      .addMethod('GET', new apigateway.LambdaIntegration(apiHandler));

    // Scraper Lambda
    const scraperHandler = new lambda.Function(this, 'ScraperHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../backend/scraper/dist'),
      timeout: cdk.Duration.minutes(15),
      environment: {
        DATABASE_SECRET_ARN: databaseSecret.secretArn
      }
    });

    // Grant Lambda access to secret
    databaseSecret.grantRead(scraperHandler);

    // Schedule scraper to run weekly on Sunday
    new events.Rule(this, 'WeeklyScraperSchedule', {
      schedule: events.Schedule.expression('cron(0 1 ? * SUN *)'),
      targets: [new targets.LambdaFunction(scraperHandler)]
    });
  }
}