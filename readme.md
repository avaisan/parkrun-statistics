## ParkRun Statistics

This is a personal hobby project to show ParkRun event statistics for Nordic countries to see which events are "the fastest", what are the average run times, so participants can brag about their times or events.

![Screenshot of the UI](./public/frontend.jpg)

Tech stack is Node.js/Typescript, React and AWS CDK. Locally environments can run on standalone setup, if you have node.js and npm installed, or in Docker. Deployments to AWS are done with GitHub Actions.
![Screenshot of the UI](./public/infra.jpg)

Data update relies on manual updates for now, as source data has to be fetched from official ParkRun website first. This project includes a scraper that gets the data and inserts it to a PostgreSQL database running in Docker. From there, data can be exported as JSON, which is then uploaded to S3 data bucket.

**Note:** Application assumes data files are there in data bucket in correctly named files, with correct format.

## Prerequisites
- Node.js v22.13 or higher (v24 recommended; it matches CI and the AWS Lambda runtime)
- npm
- Docker
- AWS Account
- Route 53 domain

### Local setup
0. Run `npm install && npm run build` from project root. The build also generates the Prisma client that the scraper uses. Generate it again (`npm run build`, or just `npm run generate -w prisma`) after a fresh install or after changing `prisma/schema.prisma`.
1. Run `npm run db` to spin up the database.
2. Initialize database with Prisma migrations:
   ```bash
   npm run db:migrate
   ```
3. To populate database, run the scraper:
   ```bash
   # Fetch all events from all countries from last 7 days:
   npm run scraper

   # Fetch a single country from a specific date:
   npm run scraper -- --country XX --from YYYY-MM-DD
   ```
   This might fail to captcha. I won't instruct here how to get past that.

4. Export data from the database as JSON and save two files to the `data` folder:
   - `parkrun_data.json`: Event statistics 
   - `latest_date.json`: Latest event date

5. Start the API (reads the JSON files from the `data` folder, see `DATA_DIR` below):
   ```bash
   npm run api
   ```

6. Start the frontend development server:
   ```bash
   npm run frontend
   ```
   The UI will be available at `localhost:5173`

### Cloud setup
1. Run CloudFormation stack `oidc-role.yml` to your AWS account to setup permissions for GitHub Actions.
   Bootstrap CDK in both regions used by the app (the CloudFront certificate stack is in us-east-1):
   ```bash
   npx cdk bootstrap aws://<account-id>/eu-central-1 aws://<account-id>/us-east-1
   ```
2. Add these secrets to GitHub repo:
- AWS_ROLE_ARN (see output from oidc-role.yml)
- AWS_ACCOUNT_ID
As repo variable, add domain name (e.g. yourdomain.com). You need to have manually set up domain first.
Also add `HOSTED_ZONE_ID` as a secret. No personal access token is needed: the deploy workflows read the bucket, CloudFront distribution and API endpoint from the CloudFormation stack outputs.

3. Push changes to main branch - observe pipelines triggering. Run `deploy-infra.yml` first so you have infrastructure. Then `deploy-api` and `deploy-frontend` have something to push into. You can also trigger pipelines manually and select the environment and branch you want to deploy.

I usually first push my feature branch, then use manual trigger to deploy that branch to dev environment. If that works, then main branch can be updated.

### Environments
Cloud environments are managed via context in `cdk.json`. As template, dev and prod are configured.
If you want to do cdk deploy from local computer, you may need to change cdk.json dev environment to contain AWS account ID.

Local setup is handled via docker-compose. For local env:
1. Create `.env` file in [`prisma`](prisma) folder:
```properties
DATABASE_URL=postgresql://parkrun:parkrun@localhost:5433/parkrun?schema=public
NODE_ENV=development
```
2. Create `.env` file in [`api`](api) folder:
```properties
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173
DATA_DIR=../data
```
`api/.env` is loaded when the API runs locally with `npm run api`. `DATA_DIR` is the folder holding `parkrun_data.json` and `latest_date.json`; relative paths resolve from the `api` folder. If unset, it defaults to `/app/data` (the Docker mount). Values set by docker-compose take precedence over `api/.env`.
3. Create `.env` file in [`frontend`](frontend) folder:
```properties
VITE_API_URL=http://localhost:3001
```

### Deployments
- CDK is used only to provision infrastructure. It does not deploy application code.
- Frontend pipeline triggers when changes are done to `frontend` folder on main branch. This gets pushed to dev environment.
- API pipeline triggers when changes are done to `api` folder on main branch. This gets pushed to dev environment.
- The frontend deployment reads the S3 bucket, CloudFront distribution ID and API endpoint from the CloudFormation stack outputs of the target environment.
- Each pull request is run through linter and unit tests (if they exist). When merging PR to main branch, linter and tests run also.
- Pushing changes to prod needs to be done via manual action in GitHub Actions - Run each pipeline via run workflow -> main branch -> Environment to deploy -> prod. 
