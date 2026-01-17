import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { IEventResult } from './scraper.js'

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter })


export async function saveEventResult(eventResult: IEventResult): Promise<void> {
    try {
        const avgTime = eventResult.finishTimes.reduce((a, b) => a + b, 0) / eventResult.finishTimes.length / 60;
        const fastestTime = Math.min(...eventResult.finishTimes) / 60;

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
        console.log(`Saved event ${eventResult.eventName} #${eventResult.eventId} to database`);
    } catch (error: unknown ) {
        if (error) {
            console.log(`Error code ${(error as any).code}: Event ${eventResult.eventName} #${eventResult.eventId} already exists.`); // eslint-disable-line @typescript-eslint/no-explicit-any
        }
    }
}