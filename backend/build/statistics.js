import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export async function calculateQuarterlyStats(year, quarter) {
    // Adjust the date range logic
    const startDate = new Date(Date.UTC(year, (quarter - 1) * 3, 1));
    const endDate = new Date(Date.UTC(year, quarter * 3, 0, 23, 59, 59));
    console.log(`Fetching events between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    // Debug: First check what's in the Events table
    const allEvents = await prisma.event.findMany({
        orderBy: { eventDate: 'desc' }
    });
    console.log('\nAll events in database:');
    allEvents.forEach(event => {
        console.log(`${event.eventName} #${event.eventId}: ${event.eventDate.toISOString()}`);
    });
    const events = await prisma.event.findMany({
        where: {
            eventDate: {
                gte: startDate,
                lte: endDate
            }
        },
        orderBy: { eventDate: 'desc' }
    });
    console.log(`Found ${events.length} events`);
    if (events.length === 0) {
        console.log('No events found in the database for this period');
        return [];
    }
    // Log found events
    events.forEach(event => {
        console.log(`Event: ${event.eventName} #${event.eventId} on ${event.eventDate.toISOString()}`);
        console.log(`Finish times: ${event.finishTimes.length}`);
    });
    // Group events by name
    const eventGroups = new Map();
    events.forEach(event => {
        const key = event.eventName;
        if (!eventGroups.has(key)) {
            eventGroups.set(key, []);
        }
        eventGroups.get(key)?.push(event);
    });
    console.log(`\nProcessing ${eventGroups.size} unique event locations`);
    // Calculate statistics for each event
    const statistics = [];
    for (const [eventName, eventList] of eventGroups) {
        console.log(`\nCalculating statistics for ${eventName}`);
        const allFinishTimes = eventList.flatMap(e => e.finishTimes);
        console.log(`Total finish times: ${allFinishTimes.length}`);
        if (allFinishTimes.length === 0) {
            console.log(`No finish times found for ${eventName}, skipping`);
            continue;
        }
        const avgTime = allFinishTimes.reduce((a, b) => a + b, 0) / allFinishTimes.length / 60;
        const fastestTime = Math.min(...allFinishTimes) / 60;
        const stat = {
            EventID: `${eventName}-${year}-${quarter}`,
            EventName: eventName,
            EventCountry: eventList[0].eventCountry,
            Year: year,
            Quarter: quarter,
            AvgFinishTimeInMin: avgTime,
            FastestFinishTimeInMin: fastestTime,
            AmountOfRunners: allFinishTimes.length
        };
        console.log('Calculated statistics:', {
            avgTime: stat.AvgFinishTimeInMin.toFixed(2),
            fastestTime: stat.FastestFinishTimeInMin.toFixed(2),
            runners: stat.AmountOfRunners
        });
        statistics.push(stat);
        try {
            const result = await prisma.eventStatistics.upsert({
                where: {
                    eventName_year_quarter: {
                        eventName: stat.EventName,
                        year: stat.Year,
                        quarter: stat.Quarter
                    }
                },
                update: {
                    eventId: stat.EventID,
                    eventCountry: stat.EventCountry,
                    avgFinishTimeInMin: stat.AvgFinishTimeInMin,
                    fastestFinishTimeInMin: stat.FastestFinishTimeInMin,
                    amountOfRunners: stat.AmountOfRunners
                },
                create: {
                    eventId: stat.EventID,
                    eventName: stat.EventName,
                    eventCountry: stat.EventCountry,
                    year: stat.Year,
                    quarter: stat.Quarter,
                    avgFinishTimeInMin: stat.AvgFinishTimeInMin,
                    fastestFinishTimeInMin: stat.FastestFinishTimeInMin,
                    amountOfRunners: stat.AmountOfRunners
                }
            });
            console.log(`Successfully ${result.id ? 'created' : 'updated'} statistics for ${stat.EventName}`);
            // Verify the record exists
            const saved = await prisma.eventStatistics.findUnique({
                where: {
                    eventName_year_quarter: {
                        eventName: stat.EventName,
                        year: stat.Year,
                        quarter: stat.Quarter
                    }
                }
            });
            console.log('Saved record:', saved);
        }
        catch (error) {
            console.error(`Error saving statistics for ${stat.EventName}:`, error);
            throw error; // Re-throw to catch in main
        }
    }
    return statistics;
}
// CLI handler
if (process.argv[1] === import.meta.url) {
    const year = parseInt(process.argv[2]) || new Date().getFullYear();
    const quarter = parseInt(process.argv[3]) || Math.floor((new Date().getMonth() / 3)) + 1;
    console.log(`\nCalculating statistics for ${year} Q${quarter}`);
    calculateQuarterlyStats(year, quarter)
        .then(stats => {
        console.log(`\nProcessed ${stats.length} event statistics`);
    })
        .catch((e) => {
        console.error('Error processing statistics:', e);
        process.exit(1);
    })
        .finally(async () => {
        await prisma.$disconnect();
    });
}
