import { PrismaClient } from '@prisma/client';
import { IEventResult } from './scraper.js'

const prisma = new PrismaClient()

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