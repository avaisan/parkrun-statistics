import { getHistoryofEvents, getEventResults } from './scraper.js';
import { saveEventResult } from './save_to_db.js';
import { PARKRUN_EVENTS_PER_COUNTRY } from './events.js';
async function main() {
    /*
    * Main function to process events.
    * It takes a country code and a date as arguments.
    * Returns event results for the specified country and date.
    * The default country is 'FI' (Finland) and the default date is '2025-01-01'.
    */
    const args = process.argv.slice(2);
    const countryCode = (args[0] ?? 'FI');
    const dateStr = args[1] ?? '2025-01-01';
    const fromDate = new Date(dateStr);
    const config = PARKRUN_EVENTS_PER_COUNTRY[countryCode];
    console.log(`\nProcessing events for ${config.country} from ${fromDate.toISOString().split('T')[0]}`);
    for (const eventName of config.events) {
        console.log(`\nProcessing ${eventName}`);
        const eventHistory = await getHistoryofEvents(countryCode, eventName, fromDate);
        if (eventHistory.length === 0) {
            console.log(`No events found for ${eventName} since ${fromDate.toISOString().split('T')[0]}`);
            continue;
        }
        for (const event of eventHistory) {
            const eventResult = await getEventResults(countryCode, eventName, event.eventId);
            if (eventResult) {
                console.log(`Found ${eventResult.finishTimes.length} results for event #${event.eventId}`);
                await saveEventResult(eventResult);
            }
        }
    }
}
main().catch(error => {
    console.error('Error in main:', error);
    process.exit(1);
});
