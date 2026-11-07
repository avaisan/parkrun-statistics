import { PrismaClient, Prisma } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { IEventResult } from './scraper.js'

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env'), quiet: true });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter })

/**
 * Returns which of the given event numbers are already stored for this event, so the
 * scraper can skip fetching their results pages (one query instead of one request each).
 */
export async function getStoredEventIds(eventName: string, eventIds: number[]): Promise<Set<number>> {
    if (eventIds.length === 0) {
        return new Set();
    }
    const rows = await prisma.event.findMany({
        where: { eventName, eventId: { in: eventIds } },
        select: { eventId: true }
    });
    return new Set(rows.map(row => row.eventId));
}

/** Closes the Prisma client and its connection pool so the process can exit immediately. */
export async function disconnectDatabase(): Promise<void> {
    await prisma.$disconnect();
    await pool.end();
}

/** Prisma error code for a unique constraint violation (eventName + eventId already stored). */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Result of trying to store one event:
 * - `saved`: inserted
 * - `duplicate`: already in the database (expected on re-runs)
 * - `invalid`: not stored, scraped data failed validation
 * - `failed`: not stored because of a database or other error; it will be retried on the next run
 */
export type SaveOutcome = 'saved' | 'duplicate' | 'invalid' | 'failed';

/**
 * Stores one scraped event with its average and fastest finish time in minutes.
 * Never throws, so one bad event does not stop the scraper; callers use the outcome.
 */
export async function saveEventResult(eventResult: IEventResult): Promise<SaveOutcome> {
    const label = `${eventResult.eventName} #${eventResult.eventId}`;

    if (eventResult.finishTimes.length === 0) {
        console.error(`Not saving event ${label}: no finish times.`);
        return 'invalid';
    }

    const avgTime = eventResult.finishTimes.reduce((a, b) => a + b, 0) / eventResult.finishTimes.length / 60;
    const fastestTime = Math.min(...eventResult.finishTimes) / 60;

    try {
        await prisma.event.create({
            data: {
                eventId: eventResult.eventId,
                eventName: eventResult.eventName,
                eventCountry: eventResult.eventCountry,
                eventDate: new Date(eventResult.eventDate),
                finishTimes: eventResult.finishTimes,
                avgFinishTimeInMin: avgTime,
                fastestFinishTimeInMin: fastestTime
            }
        });
        console.log(`Saved event ${label} to database`);
        return 'saved';
    } catch (error: unknown) {
        const isKnownPrismaError = error instanceof Prisma.PrismaClientKnownRequestError;

        if (isKnownPrismaError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
            console.log(`Event ${label} already exists, skipping.`);
            return 'duplicate';
        }

        const code = isKnownPrismaError ? ` (${error.code})` : '';
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Failed to save event ${label}${code}: ${message}`);
        return 'failed';
    }
}
