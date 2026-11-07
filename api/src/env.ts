import { existsSync } from 'fs';

/*
 * Loads variables from `.env` in the working directory for local (non-Lambda) runs.
 * Variables already set in the environment (e.g. by docker-compose) take precedence.
 * Must be imported before any module that reads process.env at load time.
 */
const ENV_FILE = '.env';

if (existsSync(ENV_FILE)) {
    process.loadEnvFile(ENV_FILE);
}
