# ParkRun Infrastructure

This project contains the AWS CDK infrastructure code for the ParkRun Statistics application.

## Architecture

The infrastructure consists of:
- CloudFront distribution
- Route53 hosted zone management
- ACM creation and management
- S3 bucket for frontend code
- Lambda function and API gateway setup
- CloudWatch monitoring


### Environments
Environments are managed via context. If another environment is desireable, just add or modify an account in `cdk.json` and run command e.g. `cdk deploy --all -c environment=prod` to deploy prod.

For different configurations to e.g. different AWS account per env, modify `cdk.json`.

GitHub actions are defined to deploy 'dev' environment with default settings. Deploying to 'prod' is done by triggering the workflows manually. If this is deployed locally and no environment variable is set, it deploys 'dev'. Currently the only difference with these two is that resource names are different.


## Prerequisites

- Node.js 22.x
- GitHub account with repository secrets set up
- AWS account with appropriate permissions (see related OIDC-role.yml)
- Route53 domain that has been created beforehand.

## Setup

1. Install dependencies to generate builds:
```bash
npm install && npm run build
```
2. Create GitHub repo secrets:
```
AWS_ROLE_ARN: ARN of the IAM role for GitHub Actions
AWS_ACCOUNT_ID: Your AWS account ID
GH_PA_TOKEN: PAT token with repo secret to read and write secrets
```
2.1. If you plan to run cdk deploy locally, update `cdk.json` with correct AWS account IDs.
2.2 CDK commands:
```
cdk bootstrap --profile XXXX (you name it via aws configure sso)
cdk deploy --all
cdk destroy --all
```
3. Provision infrastructure using `deploy-infra` workflow.
4. Run scraper locally, export data from database as json and save files to S3 data bucket.
5. Deploy API with `deploy-api`.
6. Deploy frontend with `deploy-frontend`.

### Security, monitoring
- Frontend is deployed to S3 for ease of deployment and cost savings.
- S3 is only accessible from CloudFront distribution.
- API is only accessible from frontend domain.
- Logs, metrics go to CloudWatch so identifying access and usage patterns is doable.
