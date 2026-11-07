# ParkRun Project Instructions

This is a TypeScript monorepo for ParkRun tracking and visualization.

## Tech Stack

- **Language**: TypeScript (Node.js)
- **Frontend**: React 19 + Vite + MUI (in `frontend/` workspace)
- **API**: Express.js locally, AWS Lambda handler in the cloud (in `api/` workspace)
- **Database**: PostgreSQL with Prisma ORM (in `prisma/` workspace)
- **Scraper**: Node.js scraper (in `scraper/` workspace)
- **Infrastructure**: AWS CDK (in `cdk/` workspace)
- **Testing**: Vitest with coverage
- **Linting**: ESLint 9 flat config
- **Package Manager**: npm workspaces

### Toolchain notes (upgraded 2026-11-07)

- **TypeScript 7 + 6 side by side**: TS 7 (native compiler) ships no JS API, and typescript-eslint supports only TS < 6.1. Following Microsoft's guidance, root `package.json` has `"@typescript/native": "npm:typescript@^7"` (provides `tsc`) and `"typescript": "npm:@typescript/typescript6@^6"` (the API that typescript-eslint imports, plus `tsc6`). Don't "fix" the alias to plain `typescript@7` until typescript-eslint supports TS 7.
- TS 7 removed `moduleResolution: "node"`. Node-run workspaces (`api`, `scraper`, `prisma`) use `module`/`moduleResolution: "nodenext"`, so **relative imports need `.js` extensions**, tests included. `cdk` uses `bundler` (run via tsx). TS 7 defaults `types` to `[]`, so tsconfigs list `"types": ["node"]` explicitly.
- `frontend` build is `vite build` only (no type-check). Type-check manually with `npx tsc -p frontend/tsconfig.app.json --noEmit`.
- **MUI 9**: system props on `Box`/`Stack`/`Typography` (`mt`, `display`, `justifyContent`, …) are removed. Use `sx`. Typography's `color` prop still exists.
- **ESLint 10**: `eslint:recommended` adds `preserve-caught-error`. When rethrowing in a `catch`, pass `{ cause: error }`.
- **Node/npm**: `engines.node` is `>=22.13` and `.nvmrc` pins 24. npm 11 only runs dependency install scripts listed in root `package.json` `allowScripts` (esbuild, prisma, @prisma/engines). Review and approve new ones with `npm install-scripts ls` / `approve <pkg>`.
- **Runtime alignment**: Node 24 everywhere (CI `node-version: '24'`, `node:24-slim` dev images, Lambda `NODEJS_24_X`). `@types/node` is pinned to `^24` on purpose, to match the runtime; don't bump it to a newer major alone. Move all of these to Node 26 together once Lambda `nodejs26.x` is GA and aws-cdk-lib exposes it.
- **Vite 8** (Rolldown/Oxc) needs `@vitejs/plugin-react` 6. **Vitest 5** sets `clearMocks: true` by default and requires `vi.mock` at top level.

## Project Structure

```
ParkRun/
├── api/          # Express API server
├── frontend/     # React frontend UI
├── scraper/      # Data scraping service
├── prisma/       # Database schema and migrations
├── cdk/          # AWS CDK infrastructure
├── public/       # Static assets
└── data/         # Data files
```

## Runtime

### How data flows

```
parkrun.com ──scraper──▶ PostgreSQL (Docker only) ──manual JSON export──▶ data/*.json
                                                                           │
                         local: API reads data/ ◀──────────────────────────┤
                         AWS:   Lambda reads S3 data bucket ◀── manual upload
frontend (browser) ──GET /api/events, /api/latest-date──▶ API
```

- The **API never queries the database**. It serves two JSON files: `parkrun_data.json` (rows of the `event_quarterly_stats` view wrapped in `{"event_quarterly_stats": [...]}`) and `latest_date.json` (`{"latest_date": "YYYY-MM-DD"}`). Templates are in `data/*.template.json`.
- Mode is chosen by `NODE_ENV`: `development` reads files from `DATA_DIR`; anything else reads from S3 (`DATA_BUCKET_NAME`, optional `STATS_FILE_PATH` / `DATE_FILE_PATH`).
- The database is only needed to **refresh** data (scraper → export). Running the UI needs only `data/`.

### Current local state

- PostgreSQL exists **only** in the Docker container `postgres:16`, data in the named volume `parkrun_postgres_data`, exposed on host port **5433** (`postgresql://parkrun:parkrun@localhost:5433/parkrun`). It has been populated by the scraper; migrations are already applied.
- Its contents have been exported to `data/parkrun_data.json` and `data/latest_date.json` (gitignored). After a scraper run the export is stale until it is re-exported (see "Refreshing data").
- Migrations: `20250412134733_initialize` is applied. `20250424180605_create_iam_users` is marked rolled back: it failed because the `readonly`/`admin` roles already existed, and its folder is not in the repo. `npm run db:migrate` reports no pending migrations.
- **This volume is the only copy of the scraped data.** `npm run db:reset` and `docker compose down -v` delete it. Never run them without explicit user approval.

### Run with Docker (full stack)

```bash
npm start               # docker compose up: postgres :5433, api :3001, frontend :5173
npm run stop            # docker compose down (keeps the volume)
npm run db              # only postgres, detached
```

- The `api` and `frontend` images build with the **repo root as context**. They run `npm ci --workspace <name> --include-workspace-root` against the root `package-lock.json`, so installs are reproducible. Rebuild with `docker compose up -d --build` after dependency changes.
- Inside the containers the repo layout is mirrored under `/repo`. Compose bind-mounts `./api` → `/repo/api` and `./frontend` → `/repo/frontend` (hot reload), and `./data` → `/repo/data`. The API container sets `NODE_ENV=development` and `DATA_DIR=/repo/data`.
- The API container also sees the mounted `api/.env`; variables set by compose take precedence over it.
- Open http://localhost:5173. Check the API with `curl localhost:3001/api/health`.

### Run locally (Node on the host)

Requires Node.js 22.13+ (Vitest 5 / ESLint 10 minimum). Use 24: CI, the Docker dev images and Lambda all run Node 24. Postgres still runs in Docker.

```bash
npm install && npm run build   # builds workspaces in order; prisma first generates the scraper's client
npm run api                    # Express on :3001, loads api/.env
npm run frontend               # Vite on :5173
```

- `api/.env` (gitignored) must contain `NODE_ENV=development` and `DATA_DIR=../data` (relative to `api/`). Without `DATA_DIR` the API falls back to `/app/data`, which only exists in Docker.
- `frontend/.env`: `VITE_API_URL=http://localhost:3001`.
- Root `.env` / `prisma/.env`: `DATABASE_URL=postgresql://parkrun:parkrun@localhost:5433/parkrun?schema=public`. The scraper loads the root `.env`.
- Prisma Client uses the Prisma 7 `prisma-client` generator and is generated into `scraper/src/generated/prisma` (gitignored; only the scraper uses it). The scraper imports it from `./generated/prisma/client.js` with the `@prisma/adapter-pg` driver adapter. `npm run clean -w prisma` deletes it.
- Prisma 7 config is `prisma.config.ts` at the repo root (schema, migrations path, `datasource.url`). Prisma no longer reads `.env` itself; the config loads `.env` from the working directory via `dotenv`. Root scripts (`db:migrate`, `db:studio`, `db:reset`) find it automatically; `prisma/` workspace scripts pass `--config ../prisma.config.ts`. Commands that touch the DB fail with `Cannot resolve environment variable: DATABASE_URL` if neither the env var nor `.env` is present.
- Mixing is fine: e.g. Postgres + API in Docker, frontend via `npm run frontend`.

### Refreshing data

1. `npm run db` (Postgres must be up).
2. Scrape: `npm run scraper` (all countries, last 7 days) or `npm run scraper -- --country FI --event <name> --from YYYY-MM-DD`. Events are listed in `scraper/src/events.ts`. Arguments are validated in `scraper/src/cli.ts`:
   - Unknown options, countries and events, and invalid dates, exit with a clear message.
   - Country codes are case-insensitive.
   - `--event` alone resolves its country from `events.ts`, so a new event must be added there first.

   How a run proceeds (`scraper/src/process_event.ts`):
   - For each event series it fetches the history once.
   - It then skips events already in the database with one query (`getStoredEventIds`), so their results pages are not fetched.
   - It fetches the rest **oldest first**. Requests are delayed 3 s.
   - On a CAPTCHA (HTML challenge or AWS WAF) the **whole run stops**, so the stored events form a contiguous range. It prints the progress, and a `--event <name> --from <date>` hint for the interrupted event.
   - After the CAPTCHA clears, rerun the same command; it continues where it stopped.
   - Other per-event failures are counted as `failed` and retried on the next run. The unique constraint (`eventName` + `eventId`) still guards against duplicates. The script runs `tsx src/index.ts` only. If Prisma says the client "did not initialize yet" (after a fresh install or a schema change), run `npm run generate -w prisma` first.
3. Export to `data/` (equivalent to the existing export):
   ```bash
   docker compose exec -T postgres psql -U parkrun -At -c "select json_build_object('event_quarterly_stats', json_agg(s)) from event_quarterly_stats s" > data/parkrun_data.json
   docker compose exec -T postgres psql -U parkrun -At -c "select json_build_object('latest_date', to_char(max(\"eventDate\"), 'YYYY-MM-DD')) from \"Event\"" > data/latest_date.json
   ```
4. Validate the export: `npm run test:api`. `api/src/services/data.contract.test.ts` runs the real data service against `data/` and checks the frontend contract: required fields and types, supported countries, quarter 1–4, positive values, time ordering and a valid `latest_date`. These tests are skipped when the gitignored export is absent (e.g. in CI); the committed `data/*.template.json` files are always checked.
5. For AWS, upload both files to the root of the environment's data bucket (see below).

### Observability

There are no metrics, tracing or alerting in the code. The Lambda writes one JSON log line per request; everything else is plain `console.*` output (`console.info` for operational logs, which lint allows in the API).

**Locally**
- Docker: `docker compose logs -f api` (startup line, `Error reading event stats/latest date` on failures), `docker compose logs -f frontend` (Vite), `docker compose logs -f postgres`. Containers are named `parkrun-<service>-1`.
- Native: logs go to the terminal running `npm run api` / `npm run frontend`. Browser-side API errors are `console.error`ed in the browser console.
- Scraper: logs each URL fetched, `N of M events already stored; not fetching them`, results count per event and `Saved event …` to stdout. Failures and CAPTCHA stops go to stderr. It ends with a summary: saved / already stored (not fetched) / already existed / invalid / failed. The exit code is 1 on failures or a CAPTCHA stop.
- Data checks: `npm run db:studio`, or `docker compose exec postgres psql -U parkrun`.

**AWS**
- Lambda logs go to CloudWatch Logs group `/parkrun/api-<env>` (region `eu-central-1`), defined in CDK with **30-day retention**. The stack output is `ApiLogGroupName`. Tail with:
  ```bash
  aws logs tail /parkrun/api-dev --follow --region eu-central-1
  ```
  The old, never-expiring `/aws/lambda/parkrun-api-<env>` group (created by Lambda before the explicit group existed) is no longer written to. Delete it manually once its old logs are no longer needed.
- The handler (`api/src/index.ts`) logs one JSON line per request: `{"msg":"request","method","path","status","durationMs","requestId"}`. Headers, source IP and user agent are **not** logged. Failures add a `{"msg":"request failed", …, "error", "cause"}` line. Clients only get `{"error":"Internal server error"}`, with no internal details.
- Lambda and API Gateway publish their default CloudWatch metrics (invocations, errors, duration, 4xx/5xx). API Gateway access/execution logging, CloudFront access logs and alarms are **not** configured.
- `/api/health` only reports that the function runs; it does not check S3.

### AWS deployment

Infrastructure (`cdk/lib/app.ts` wires the stacks; `cdk deploy --all` deploys both, certificate first):
- `parkrun-certificate-<env>` (`cdk/lib/certificate.ts`, region **us-east-1**): the ACM certificate for `<subdomain>.<domain>`, DNS-validated in the Route 53 zone. CloudFront only accepts certificates from us-east-1, so only this small stack lives there.
- `parkrun-stack-<env>` (`cdk/lib/infrastructure.ts`, region `eu-central-1`): everything else. It reads the certificate ARN via `crossRegionReferences` (an SSM parameter `/cdk/exports/...` in eu-central-1, written and read by CDK custom resources). References are `strong`, so the certificate can't be deleted while the distribution uses it.
- Both regions must be CDK-bootstrapped (`cdk bootstrap aws://<account>/eu-central-1 aws://<account>/us-east-1`).
- Feature flags: all 89 recommended flags are set in `cdk/cdk.json`. `@aws-cdk/core:defaultCrossStackReferences` is set to `strong` (not the recommended `weak`, which would remove the cross-region export). `cdk synth` prints no warnings.
- CDK assertion tests (`cdk/test/app.test.ts`, `npm test -w cdk`) cover the certificate stack, the cross-region certificate reference, OAC + error pages, Lambda runtime/CORS/log group and the dev/prod domains. They run in PR checks and before every infra deploy.
- Website: private S3 bucket → CloudFront (**Origin Access Control**, HTTPS, custom pages: 403 and 404 → `/404.html`, 500 → `/500.html`) → Route 53 alias `parkrun-dev.<domain>` (dev) / `parkrun.<domain>` (prod). With OAC, CloudFront can read objects but not list the bucket, so S3 returns 403 for missing files; hence the 403 mapping.
- API: API Gateway REST API `parkrun-api-<env>` with `GET /api/events`, `/api/latest-date`, `/api/health` → Lambda `parkrun-api-<env>` (Node 24 / `nodejs24.x`, 256 MB, 30 s).
  - Environment: `NODE_ENV=<env>`, `DATA_BUCKET_NAME=<data bucket>`, `ALLOWED_ORIGIN=https://<subdomain>.<domain>` (CORS; `*` when unset, e.g. locally).
  - The handler matches routes exactly, after collapsing duplicate slashes and trailing slashes. Other methods get 405; OPTIONS gets 204.
  - The frontend strips trailing slashes from `VITE_API_URL`, because API Gateway's URL ends with `/prod/`.
- Data: private S3 data bucket (retained on stack deletion), read-only for the Lambda. Uploading data is manual, e.g.
  ```bash
  aws cloudformation describe-stacks --stack-name parkrun-stack-dev --region eu-central-1 --query "Stacks[0].Outputs[?OutputKey=='DataBucketName'].OutputValue" --output text
  aws s3 cp data/parkrun_data.json s3://<bucket>/ && aws s3 cp data/latest_date.json s3://<bucket>/
  ```

Deployment is done by GitHub Actions with OIDC (`AWS_ROLE_ARN`, from `cdk/oidc-role.yml`):
- `deploy-infra.yml`: on push to `main` touching `cdk/**`, or manual (dev/prod). Runs `cdk deploy` and prints the stack outputs. Nothing is copied into repo secrets, so no personal access token is needed. CDK only creates the Lambda with placeholder code.
- `deploy-api.yml`: on push to `main` touching `api/**`, after a successful infra run, or manual. Lint → test → `tsc` → zip `api/dist` with `npm install --omit=dev` → `aws lambda update-function-code`.
- `deploy-frontend.yml`: same triggers for `frontend/**`. Reads `BucketName`, `DistributionId` and `ApiEndpoint` from the `parkrun-stack-<env>` CloudFormation outputs, then builds with `VITE_API_URL=<ApiEndpoint>` (the build includes the type-check), runs `aws s3 sync --delete` and invalidates CloudFront `/*`.
- Required GitHub settings: secrets `AWS_ROLE_ARN`, `AWS_ACCOUNT_ID`, `HOSTED_ZONE_ID`; variable `DOMAIN_NAME`. (The old secret-copy secrets and `GH_PA_TOKEN` were deleted on 2026-11-07.)
- `cdk/oidc-role.yml` (deployed manually as a CloudFormation stack) grants the GitHub role:
  - `sts:AssumeRole` on the CDK bootstrap roles (`cdk-hnb659fds-*`), so `cdk deploy` uses the bootstrap roles in both regions;
  - its own fallback permissions, with SSM allowed in all regions.
  Redeploy that stack after changing the file.
- **No parallel deploys of the same resources.** A push to `main` that changes `cdk/**` (or `deploy-infra.yml`) together with `api/**` or `frontend/**` skips the push-triggered API/frontend deploy; a `check-infra-change` job using `dorny/paths-filter` decides this. Those deploys then run via `workflow_run` once Deploy Infrastructure has succeeded. Before this, both ran at once and CloudFormation's Lambda update failed with a 409 and rolled back. Each deploy workflow also has a `concurrency` group per environment, so its runs never overlap.
- Automatic runs always target **dev** (including API/frontend runs chained after a manual prod infra run). For prod, run Deploy Infrastructure, then Deploy API, then Deploy Frontend manually, one at a time. Prod is deployed only by manually running each workflow with `environment: prod`.
- `pull-request-checks.yml` runs for changed workspaces on PRs. Root `package.json`, the lockfile and `eslint.config.js` count as changes to every workspace.
  - prisma: `prisma validate` + lint.
  - api: lint, test, build.
  - frontend: lint, test, build (with type-check).
  - scraper: generate client, lint, test, build.
  - cdk: lint, build, offline `cdk synth` with placeholder values.
- `destroy-infra.yml` is manual and requires typing `destroy`.
- Actions: `actions/checkout@v7`, `actions/setup-node@v7`, `aws-actions/configure-aws-credentials@v6`, `dorny/paths-filter@v4`.
- Local `cdk deploy` defaults to **prod** when `TARGET_ENV` is unset. Always set `TARGET_ENV=dev` explicitly.

### Known runtime issues (as of 2026-11-07)

- `npm audit`: 11 moderate findings, all the transitive `minimatch` ReDoS (GHSA-g3hv-75wg-m249) via eslint, typescript-eslint and aws-cdk-lib (build-time tools only). These wait for upstream fixes; don't apply `npm audit fix --force`, which downgrades majors.

### Testing
```bash
npm test                # Run all tests
npm run test:api        # Run API tests only
npm run test:frontend   # Run frontend tests only
```

## Coding Standards

Follow workspace-level `.github/instructions/backend.instructions.md` with these additions:

### TypeScript Specifics

- **Strict mode**: Use TypeScript strict mode
- **Type safety**: Prefer explicit types over `any`
- **Null handling**: Use optional chaining and nullish coalescing
- **Async/await**: Prefer async/await over raw promises

### Prisma Patterns

- **Schema changes**: Always create migrations, don't edit manually
- **Queries**: Use Prisma Client, not raw SQL (unless necessary)
- **Transactions**: Use `prisma.$transaction()` for atomic operations
- **Relations**: Leverage Prisma's relation loading with `include`

Example:
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { runs: true }
});
```

### API Patterns

- **Error handling**: Use Express error middleware
- **Validation**: Validate inputs at controller level
- **Response format**: Consistent JSON responses
```typescript
// Success
res.json({ data: result });

// Error
res.status(400).json({ error: 'Invalid input' });
```

### Testing Standards

Follow workspace `.github/instructions/testing.instructions.md`:

- **BDD style**: Use Given-When-Then naming
- **RED-first**: Write failing tests before implementation
- **Coverage**: Focus on behavior, not just line coverage
- **Mocking**: Mock external services, use real database for integration tests

Example test structure:
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('Given valid user data, When creating user, Then should return user with id', async () => {
      // Arrange
      const userData = { name: 'Test', email: 'test@example.com' };
      
      // Act
      const result = await userService.createUser(userData);
      
      // Assert
      expect(result).toHaveProperty('id');
      expect(result.name).toBe(userData.name);
    });
  });
});
```

## Security Considerations

This project handles ParkRun participant data:

- **Never log personal information**: names, emails, participant IDs
- **Database**: Use parameterized queries (Prisma handles this)
- **API**: Validate all inputs
- **Environment**: Never commit `.env` files
- **Secrets**: Use environment variables for API keys

## Documentation

- **JSDoc**: Add for exported functions and complex logic
- **README**: Keep `readme.md` up to date with setup instructions
- **Prisma schema**: Add comments for non-obvious fields

## Common Tasks

### Adding a new API endpoint

1. **Plan** (Architect mode):
   - Update `.github/agent-sessions/[branch]/spec.md`
   - Define request/response shape
   - Consider database queries needed

2. **Test** (Tester mode):
   - Create test in `api/**/*.test.ts`
   - Write RED-state tests for happy path and errors

3. **Implement** (Developer mode):
   - Add route in `api/`
   - Implement controller logic
   - Add Prisma queries if needed
   - Run `npm run test:api` to verify

4. **Review** (Reviewer mode):
   - Check against spec
   - Verify error handling
   - Confirm tests pass

### Adding a database field

1. **Update schema**: Edit `prisma/schema.prisma`
2. **Create migration**: `npx prisma migrate dev --name descriptive-name`
3. **Update types**: TypeScript types auto-generate from schema
4. **Update queries**: Modify API queries to include new field
5. **Update tests**: Add test coverage for new field

### Scraper changes

- **Idempotency**: Scraper should be safe to re-run
- **Error handling**: Log failures but continue processing
- **Rate limiting**: Respect source site rate limits
- **Data validation**: Validate scraped data before saving

## Workspace Scripts

From project root:
- `npm run build` - Build all workspaces (generates Prisma client first)
- `npm run lint` - Lint all workspaces
- `npm run clean` - Clean all workspaces
- `npm test` - Run all tests

## Infrastructure (CDK)

- **CDK code**: TypeScript in `cdk/` workspace
- **Deployment**: Uses AWS CDK for infrastructure as code
- **Stacks**: Review `cdk/` structure for specific resources

## Need Help?

Read workspace-level instructions:
- `../CLAUDE.md` - Workflow and roles
- `../.github/instructions/backend.instructions.md` - Coding principles
- `../.github/instructions/testing.instructions.md` - Testing standards
- `../.github/instructions/security.instructions.md` - Security checklist
