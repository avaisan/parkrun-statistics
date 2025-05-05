## ParkRun Statistics

This is a personal hobby project to show ParkRun event statistics for Nordic countries to see which events are "the fastest", what are the average run times, so participants can brag about their times or events.

![Screenshot of the UI](./public/frontend.jpg)

Tech stack is Node.js/Typescript, React and AWS CDK. Deployments are done with GitHub Actions.
![Screenshot of the UI](./public/infra.jpg)

Data update relies on manual updates for now, as source data has to be fetched from official ParkRun website first. This project includes a scraper that gets the data and inserts it to a PostgreSQL database running in Docker. From there, data can be exported as JSON, which is then uploaded to S3 bucket.

## Prerequisites
- Node.js v22.14.0
- Docker
- AWS Account

### Local setup
0. Run `npm install &&  npm run build` from project root.
1. Run `docker compose up -d` to spin up database and frontend.
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

4. Export data from the database as `json`, save file to `data` folder with name `parkrun-data.json`. See template file to ensure format is correct.
5. If data fetching worked and you have docker containers running, you can see the UI from `localhost:5173`.

### Cloud setup
1. Run CloudFormation stack `oidc-role.yml` to your AWS account to setup permissions for GitHub Actions
2. Add these secrets to GitHub repo:
- AWS_ROLE_ARN (see output from oidc-role.yml)
- AWS_ACCOUNT_ID
As repo variable, add domain name (e.g. yourdomain.com). You need to have manually set up domain first.

GitHub Actions will update other secrets based on CDK stack outputs.

3. Push changes to main branch - observe pipelines triggering. Run `deploy-infra.yml` first so you have infrastructure. Then `deploy-api` and `deploy-frontend` have something to push into.

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
- CDK is used only to provision infrastructure. It does not deploy application code.
- Frontend pipeline triggers when changes are done to `frontend` folder on main branch.
- CDK pipeline uses GitHub action that writes S3 bucket and Cloudfront ID into GitHub repo secrets, which frontend deployment uses to deploy code.

