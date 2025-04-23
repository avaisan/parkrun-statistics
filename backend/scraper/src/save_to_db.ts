import { PrismaClient, Prisma } from '@prisma/client'
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
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            console.log(`Error code ${error.code}: Event ${eventResult.eventName} #${eventResult.eventId} already exists.`);
        }
    }
}