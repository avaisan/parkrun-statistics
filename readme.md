## ParkRun Statistics

This is a personal hobby project to show ParkRun event statistics for Nordic countries to see which events are "the fastest", what are the average run times, so participants can brag about their times or events.

![Screenshot of the UI](./public/frontend.jpg)

Solution is written in Node.js/Typescript, frontend is written in React. This is a monorepo solution, local setup can be run locally or via docker-compose, and cloud deployment is done via CDK + GitHub Actions. Monorepo uses npm workspaces, ESLint and Prettier. See workspace folder readme files for more descriptions on solutions.

### Rant
Cloud architecture is a bit overkill considering how simplistic the app is. It could have been just a frontend app that reads a text file for getting the raw data. Now the app is a full-blown 3-tier solution with monorepo setup and maybe with too sophisticated configurations (WAF etc security hardenings). There are some benefits to this however:
- Database vs raw data file: Now that I want to update data, I can just try fetch event data from ParkRun site, get events, try to push to database - if event already exists there, then database handles data integrity and prevents saving duplicates or overwrites. With just text file update, it might be more manual work or more complex code to ensure data integrity.
- Maybe local setup could use a simple database and cloud app could have been more simple, just extract data from local db and make the cloud app read data from file: Maybe.
- Q: Could I add a search for Runner ID so people could see where they fit in the statistics? A: No. I didn't fetch people's names / IDs, because I don't want a database full of people names with their fitness data.

## Prerequisites
- Node.js v22.14.0
- Docker
- AWS Account

### Local setup
0. Run `npm install &&  npm run build` from project root.
1. Run `docker compose up -d` to spin up database, API server and frontend.
2. Initialise database with Prisma migrations:
```bash
cd backend
npm install
npm run build
npm run db:migrate
```
Now database should have the necessary schema.

3. To populate database, run scraper from `backend` folder:
```bash
# Fetch all events from all countries from last 7 days:
npm run scraper
# Fetch a single country from specific date onwards:
npm run scraper -- --country XX --from 2025-MM-DD
```
This might fail to captcha. I won't instruct here how to get past that.

4. If data fetching worked and you have docker containers running, you can see the UI from `localhost:5173`.

### Cloud setup
1. Run CloudFormation stack oidc-role.yml to your AWS account to setup permissions for GitHub Actions
2. Add these secrets to GitHub repo:
- AWS_ROLE_ARN (see output from oidc-role.yml)
- AWS_ACCOUNT_ID
- ALLOWED_ORIGINS (can be empty string)
- FRONTEND_BUCKET
- CLOUDFRONT_ID
- LAMBDA_FUNCTION_NAME
3. Push changes to main branch - observe pipelines triggering. Run `deploy-infra.yml` first so you have infrastructure. Then `deploy-backend` and `deploy-frontend` have something to push into.
4. Use SSM to get to bastion host, use the connection to populate RDS database.

```bash
# Start session to bastion host via AWS SSM:
aws ssm start-session --target <bastion-instance-id>
```

```bash
# Open SSH tunnel from bastion to RDS
aws ssm start-session \
  --target <bastion-instance-id> \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["5432"],"localPortNumber":["5432"]}'
```

5. Once infrastructure is provisioned, database has the schema + data, and application is deployed - app is ready.

**Shutdown EC2 when you are not using it.**

## Architecture
![Screenshot of the UI](./public/cloud-infra.jpg)
* Frontend: React + TypeScript + Material-UI
* Backend: Node.js/TypeScript + Express + Prisma
* Database: Aurora Serverless v2 PostgreSQL
* Infrastructure: AWS CDK (TypeScript)
    - VPC with public/private subnets
    - CloudFront + S3 for frontend
    - Lambda + API Gateway for backend
    - WAF protection
    - Bastion host for database access

### Environments
Cloud environments are managed via context in `cdk.json`. As template, dev and prod are configured.
If you want to do cdk deploy from local computer, you may need to change cdk.json dev environment to contain AWS account ID.

Local setup is handled via docker-compose. For local env, create `.env` file in backend folder:
```
DATABASE_URL=postgresql://parkrun:parkrun@localhost:5432/parkrun?schema=public
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3001
```

### Deployments
CDK is used only to provision infrastructure. It does not deploy application code, even though it would be doable, because:
- I wanted to decouple infra from application code. I want to deploy app code separately from infra, even the initial setup. I have an opinion it is a bad practice to couple infra deployments with application deployments. I rarely see the benefits of deploying both at once, but most often I do see downsides (slowness, risk, fear of using it or fear of running a deployment, refactoring screwing over the setup, resulting in accidental infrastructure deletion, etc.)
- tl;dr: Use separate workflows to deploy application code. Push to main branch, file changes in frontend/backend/cdk folders triggers respective workflows.
