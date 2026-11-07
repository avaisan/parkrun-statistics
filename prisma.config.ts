import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/*
 * Prisma 7 config. Prisma no longer reads .env files itself, so dotenv loads
 * `.env` from the working directory (repo root: DATABASE_URL on localhost:5433).
 * Variables already set in the environment take precedence.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
