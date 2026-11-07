import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { copyFile, mkdtemp, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { FILES } from '../config.js';
import { readEventStats, readLatestDate } from './data.js';

/*
 * Contract tests: run the real data service (development mode, real files, no mocks)
 * and check that its output matches what the frontend expects.
 * - Template data (`data/*.template.json`, committed) always runs.
 * - The local export (`data/parkrun_data.json`, gitignored) runs only when it exists,
 *   so a fresh export can be checked before it is uploaded to S3.
 */

const REPO_DATA_DIR = fileURLToPath(new URL('../../../data/', import.meta.url));

/** Countries the frontend can filter and link (see frontend StatsTable COUNTRY_NAMES/BASE_URLS). */
const SUPPORTED_COUNTRIES = ['Finland', 'Sweden', 'Norway', 'Denmark'];
const TIME_FIELDS = ['fastest_time', 'fastest_quartile', 'avg_finish_time', 'slowest_quartile'] as const;

interface IQuarterlyStatsRow {
    eventName: string;
    eventCountry: string;
    year: number;
    quarter: number;
    fastest_time: number;
    fastest_quartile: number;
    avg_finish_time: number;
    slowest_quartile: number;
    avg_participants: number;
}

const hasLocalExport = existsSync(join(REPO_DATA_DIR, FILES.STATS)) && existsSync(join(REPO_DATA_DIR, FILES.LATEST_DATE));

function defineContractTests(source: string, resolveDataDir: () => string) {
    let previousNodeEnv: string | undefined;
    let previousDataDir: string | undefined;

    beforeEach(() => {
        previousNodeEnv = process.env.NODE_ENV;
        previousDataDir = process.env.DATA_DIR;
        process.env.NODE_ENV = 'development';
        process.env.DATA_DIR = resolveDataDir();
    });

    afterEach(() => {
        process.env.NODE_ENV = previousNodeEnv;
        if (previousDataDir === undefined) {
            delete process.env.DATA_DIR;
        } else {
            process.env.DATA_DIR = previousDataDir;
        }
    });

    it(`Given ${source}, When reading event stats, Then should return a non-empty list of rows with all required fields and correct types`, async () => {
        const rows: IQuarterlyStatsRow[] = await readEventStats();

        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
            expect(typeof row.eventName).toBe('string');
            expect(row.eventName.length).toBeGreaterThan(0);
            expect(SUPPORTED_COUNTRIES).toContain(row.eventCountry);
            expect(Number.isInteger(row.year)).toBe(true);
            expect(Number.isInteger(row.quarter)).toBe(true);
            expect(row.quarter).toBeGreaterThanOrEqual(1);
            expect(row.quarter).toBeLessThanOrEqual(4);
            for (const field of [...TIME_FIELDS, 'avg_participants'] as const) {
                expect(Number.isFinite(row[field]), `${row.eventName} ${row.year} Q${row.quarter} ${field}`).toBe(true);
            }
        }
    });

    it(`Given ${source}, When reading event stats, Then should have only positive times and participant counts`, async () => {
        const rows: IQuarterlyStatsRow[] = await readEventStats();

        for (const row of rows) {
            for (const field of [...TIME_FIELDS, 'avg_participants'] as const) {
                expect(row[field], `${row.eventName} ${row.year} Q${row.quarter} ${field}`).toBeGreaterThan(0);
            }
        }
    });

    /*
     * Only orderings that always hold are asserted. fastest_time is the quarter's minimum,
     * and quartiles are percentiles of the same times. The average is NOT bounded by the
     * quartiles: a long tail of slow finishers can lift it above the 75th percentile
     * (seen in real data), so it is only checked against the minimum.
     */
    it(`Given ${source}, When reading event stats, Then should order fastest time <= fastest quartile <= slowest quartile and fastest time <= average`, async () => {
        const rows: IQuarterlyStatsRow[] = await readEventStats();

        for (const row of rows) {
            const label = `${row.eventName} ${row.year} Q${row.quarter}`;
            expect(row.fastest_time, label).toBeLessThanOrEqual(row.fastest_quartile);
            expect(row.fastest_quartile, label).toBeLessThanOrEqual(row.slowest_quartile);
            expect(row.fastest_time, label).toBeLessThanOrEqual(row.avg_finish_time);
        }
    });

    it(`Given ${source}, When reading latest date, Then should return a valid YYYY-MM-DD latest_date`, async () => {
        const result: { latest_date: string } = await readLatestDate();

        expect(result.latest_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const parsed = new Date(`${result.latest_date}T00:00:00Z`);
        expect(Number.isNaN(parsed.getTime())).toBe(false);
        expect(parsed.toISOString().slice(0, 10)).toBe(result.latest_date);
    });
}

describe('Data service contract: committed template data', () => {
    let templateDir: string;

    beforeAll(async () => {
        templateDir = await mkdtemp(join(tmpdir(), 'parkrun-contract-'));
        await copyFile(join(REPO_DATA_DIR, 'parkrun_data.template.json'), join(templateDir, FILES.STATS));
        await copyFile(join(REPO_DATA_DIR, 'latest_date.template.json'), join(templateDir, FILES.LATEST_DATE));
    });

    afterAll(async () => {
        await rm(templateDir, { recursive: true, force: true });
    });

    defineContractTests('the committed template data', () => templateDir);
});

describe.skipIf(!hasLocalExport)('Data service contract: local export in data/', () => {
    defineContractTests('the local export in data/', () => REPO_DATA_DIR);
});
