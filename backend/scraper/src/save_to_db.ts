import { PrismaClient } from '@prisma/client'
import { IEventResult } from './types'

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
    } catch (error) {
        console.log(`Event ${eventResult.eventName} #${eventResult.eventId} already exists (if code P2002) or some other error`, (error as any).code);
    }
}