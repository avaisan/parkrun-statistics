import axios from "axios";
import * as cheerio from "cheerio";
import { PARKRUN_EVENTS_PER_COUNTRY, CountryCode } from "./events.js";

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Connection': 'keep-alive',
    'Referer': 'https://www.parkrun.com/',
    'DNT': '1',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
};

const DELAY_MS = 3000;

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface IEventHistory {
    eventId: number;
    date: string;
}

export interface IEventResult {
    eventCountry: string
    eventName: string;
    eventId: number;
    eventDate: string;
    finishTimes: number[];
}

export async function getHistoryofEvents(countryCode: CountryCode, eventName: string, fromDate: Date): Promise<IEventHistory[]> {
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
        
        await delay(DELAY_MS);
        const response = await axios.get(historyUrl, { 
            headers: HEADERS,
            timeout: 30000,
            maxRedirects: 5
        });
        
        if (response.data.includes('captcha') || response.data.includes('Human Verification')) {
            console.error('CAPTCHA detected. Try again later or reduce request frequency.');
            return [];
        }
        
        const $ = cheerio.load(response.data);
        const events: IEventHistory[] = [];;

        $('.Results-table tr.Results-table-row').each((_index, row) => {
            const $row = $(row);
            const eventId = $row.data('parkrun') as string;
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
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.headers?.['x-amzn-waf-action'] === 'captcha') {
            console.error(`CAPTCHA triggered for ${eventName}. Wait and retry later.`);
        } else {
            console.error(`Error fetching event history for ${eventName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return [];
    }
}

/*
* Fetches the results for a given event ID.
* Returns an object containing the event country, name, date, and an array of finish times in seconds.
* Event date can be in two different formats in the page. If date is in format dd/mm/yyyy, it is converted to yyyy-mm-dd. If date is in format yyyy-mm-dd, it is returned as is.
*/
export async function getEventResults(countryCode: CountryCode, eventName: string, eventId: number): Promise<IEventResult | null> {
    const config = PARKRUN_EVENTS_PER_COUNTRY[countryCode];
    try {
        const eventUrl = `${config.baseUrl}/${eventName}/results/${eventId}/`;
        console.log(`\nFetching results for ${eventName} event #${eventId}`);
        
        await delay(DELAY_MS);
        const response = await axios.get(eventUrl, { 
            headers: HEADERS,
            timeout: 30000,
            maxRedirects: 5
        });
        
        if (response.data.includes('captcha') || response.data.includes('Human Verification')) {
            console.error('CAPTCHA detected. Try again later or reduce request frequency.');
            return null;
        }
        
        const $ = cheerio.load(response.data);
        
        const dateText = $('.format-date').text().trim();
        
        let eventDate: string;
        const isoMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (isoMatch) {
            eventDate = dateText;
        } else {
            const oldMatch = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
            if (oldMatch) {
                eventDate = `${oldMatch[3]}-${oldMatch[2]}-${oldMatch[1]}`;
            } else {
                console.error('Could not find date in page:', dateText);
                return null;
            }
        }
        
        const finishTimes: number[] = [];

        $('.Results-table tbody tr').each((_, row) => {
            const cols = $(row).find('td');
            if (cols.length < 6) return;

            const timeText = $(cols[5]).text().trim();
            const timeMatch = timeText.match(/(?:(\d+):)?(\d+):(\d+)/);

            if (timeMatch) {
                const [, hours, minutes, seconds] = timeMatch;
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

    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.headers?.['x-amzn-waf-action'] === 'captcha') {
            console.error(`CAPTCHA triggered for event #${eventId}. Wait and retry later.`);
        } else {
            console.error(`Error fetching results for event #${eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return null;
    }
}

