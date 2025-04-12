import axios from "axios";
import * as cheerio from "cheerio";
import { PARKRUN_EVENTS_PER_COUNTRY } from "./events.js";
export { getHistoryofEvents, getEventResults };
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
};
async function getHistoryofEvents(countryCode, eventName, fromDate) {
    /*
    * Fetches the event history for a given event name.
    * Returns an array of event history entries.
    * Each entry contains the event ID and date.
    * The event ID is used to fetch the results for that event.
    */
    const config = PARKRUN_EVENTS_PER_COUNTRY[countryCode];
    try {
        const historyUrl = `${config.baseUrl}/${eventName}/results/eventhistory/`;
        console.log(`\nFetching event history from: ${historyUrl}`);
        const response = await axios.get(historyUrl, { headers: HEADERS });
        const $ = cheerio.load(response.data);
        const events = [];
        $('.Results-table tr.Results-table-row').each((_, row) => {
            const $row = $(row);
            const eventId = $row.data('parkrun');
            const date = $row.data('date');
            if (eventId && date) {
                const eventDate = new Date(String(date));
                if (eventDate >= fromDate) {
                    events.push({
                        eventId: parseInt(eventId),
                        date: String(date)
                    });
                }
            }
        });
        console.log(`Found ${events.length} events since ${fromDate.toISOString().split('T')[0]}`);
        return events;
    }
    catch (error) {
        console.error(`Error fetching event history for ${eventName}:`, error);
        return [];
    }
}
async function getEventResults(countryCode, eventName, eventId) {
    const config = PARKRUN_EVENTS_PER_COUNTRY[countryCode];
    try {
        const eventUrl = `${config.baseUrl}/${eventName}/results/${eventId}/`;
        console.log(`\nFetching results for ${eventName} event #${eventId}`);
        const response = await axios.get(eventUrl, { headers: HEADERS });
        const $ = cheerio.load(response.data);
        const dateText = $('.format-date').text();
        const dateMatch = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (!dateMatch) {
            console.error('Could not find date in page:', dateText);
            return null;
        }
        const eventDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
        const finishTimes = [];
        $('.Results-table tbody tr').each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length < 6)
                return;
            const timeText = $(cols[5]).text().trim();
            const timeMatch = timeText.match(/(?:(\d+):)?(\d+):(\d+)/);
            if (timeMatch) {
                const [_, hours, minutes, seconds] = timeMatch;
                const totalSeconds = (hours ? parseInt(hours) * 3600 : 0) +
                    parseInt(minutes) * 60 +
                    parseInt(seconds);
                finishTimes.push(totalSeconds);
            }
        });
        return {
            eventCountry: config.country,
            eventName,
            eventId,
            eventDate,
            finishTimes
        };
    }
    catch (error) {
        console.error(`Error fetching results for event #${eventId}:`, error);
        return null;
    }
}
