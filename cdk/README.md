# ParkRun Infrastructure

This project contains the AWS CDK infrastructure code for the ParkRun application.

CDK is only used to deploy infrastructure. All stacks deploy empty databases, empty lambda, empty S3 bucket. Other workflows are used to deploy application code.

## Architecture

The infrastructure consists of:
- VPC with public and private subnets
- Aurora Serverless v2 PostgreSQL database
- Lambda-based API with REST API Gateway
- CloudFront distribution for frontend
- WAF protection for both API Gateway and CloudFront
- Bastion host for database access
- IAM roles and security configurations

### CDK stacks
- InfrastructureStack: VPC, Bastion host
- WAFStack: Web Application Firewall rules
- DatabaseStack: Aurora Serverless v2 cluster
- BackendStack: Lambda function, API Gateway
- FrontendStack: S3 bucket, CloudFront

Infrastructure, database and backend stacks are created as Nested Stacks. Database and backend stacks reference resources created in infrastructure stack, so they are defined and deployed via BaseStack.

Frontend stack references CloudFront WAF, which is global / deployed to us-east-1, so it is created as independent stack, as nested stacks seem to have a requirement of being in the same region.

### Environments
Environments are managed via context. If another environment is desireable, just add or modify an account in `cdk.json` and run command e.g. `cdk deploy --all -c environment=prod` to deploy prod.

For different configurations to e.g. DB cluster per env, more configs would need to be added to `cdk.json` and `config.ts`.

For now, GitHub actions are defined to deploy 'prod' environment with default settings. If this is deployed locally and no environment variable is set, it deploys 'dev'. Currently the only difference with these two is that resource names are different.


## Prerequisites

- Node.js 22.x
- GitHub account with repository secrets set up
- AWS account with appropriate permissions (see related OIDC-role.yml)

## Setup

1. Install dependencies to generate builds:
```bash
npm install && npm run build
```
2. Create GitHub repo secrets:
```
AWS_ROLE_ARN: ARN of the IAM role for GitHub Actions
AWS_ACCOUNT_ID: Your AWS account ID
LAMBDA_FUNCTION_NAME: Name of the Lambda function
```
2.1. If you plan to run cdk deploy locally, update `cdk.json` with correct AWS account IDs.
2.2 CDK commands:
```
cdk bootstrap --profile XXXX (you name it via aws configure sso)
cdk deploy --all
cdk destroy --all
```
3. Provision infrastructure using `deploy-infra` workflow.
4. Connect to database, run schema updates and populate tables.
5. Deploy backend with `deploy-backend`.
6. Deploy frontend with `deploy-frontend`.

### Security, monitoring, scalability considerations
- Frontend is deployed to S3 for ease of deployment and cost savings
- Though this is just a statistics app with little usage, I still deployed WAF in front of CloudFront and API Gateway. Access to frontend S3 bucket is restricted to CloudFront.
- Database is in private subnet with no public access. It can only be accessed by backend API lambda with read-only access via RDS Data API, and via bastion host (IAM authentication, to update data).
- Database is hosted in Aurora Serverless v2 to save on costs.
- Logs, metrics go to CloudWatch so identifying access and usage patterns is doable.