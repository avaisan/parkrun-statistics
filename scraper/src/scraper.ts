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
const MAX_RESULT_PAGES = 50;
const NEXT_LINK_TEXTS = ['next', '»', '›'];

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * parkrun answered with a CAPTCHA (HTML challenge or AWS WAF captcha action).
 * Thrown instead of returning empty/partial data so the caller can stop the whole run:
 * a CAPTCHA is per client, so further requests would only hit it again.
 */
export class CaptchaError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CaptchaError';
    }
}

function isWafCaptcha(error: unknown): boolean {
    return axios.isAxiosError(error) && error.response?.headers?.['x-amzn-waf-action'] === 'captcha';
}

function isCaptchaPage(html: string): boolean {
    return html.includes('captcha') || html.includes('Human Verification');
}

/*
 * Finds the next results page for the same event, or null when there is none.
 * Only links under the event's own results path are followed, so a "next event"
 * link can never merge another event's runners into this one. Visited pages are
 * skipped to avoid loops.
 */
function findNextResultsPage($: cheerio.CheerioAPI, currentUrl: string, resultsPath: string, visited: Set<string>): string | null {
    const candidates = [
        $('a[rel="next"]').attr('href'),
        $('a').filter((_, el) => NEXT_LINK_TEXTS.includes($(el).text().trim().toLowerCase())).first().attr('href')
    ];

    const current = new URL(currentUrl);
    for (const href of candidates) {
        if (!href) continue;

        let resolved: URL;
        try {
            resolved = new URL(href, current);
        } catch {
            continue;
        }

        const sameEventResults = resolved.origin === current.origin && resolved.pathname.startsWith(resultsPath);
        if (sameEventResults && !visited.has(resolved.href)) {
            return resolved.href;
        }
    }
    return null;
}

export interface IEventHistory {
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
    * Returns the events on or after fromDate, oldest first (ascending event number), so an
    * interrupted run has stored a contiguous range and a rerun continues where it stopped.
    * Each entry contains the event ID and date; the event ID is used to fetch the results.
    * Throws CaptchaError when parkrun answers with a CAPTCHA.
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
        
        if (isCaptchaPage(response.data)) {
            throw new CaptchaError(`CAPTCHA while fetching the event history of ${eventName}.`);
        }

        const $ = cheerio.load(response.data);
        const events: IEventHistory[] = [];

        $('.Results-table tr.Results-table-row').each((_index, row) => {
            const $row = $(row);
            const eventId = $row.data('parkrun') as string;
            const date = $row.data('date');

            if (eventId && date) {
                const eventDate = new Date(String(date));
                if (eventDate >= fromDate) {
                    events.push({
                        eventId: parseInt(String(eventId)),
                        date: String(date)
                    });
                }
            }
        });

        // The history page lists the newest event first; process oldest first
        events.sort((a, b) => a.eventId - b.eventId);

        console.log(`Found ${events.length} events since ${fromDate.toISOString().split('T')[0]}`);
        return events;
    } catch (error) {
        if (error instanceof CaptchaError) throw error;
        if (isWafCaptcha(error)) {
            throw new CaptchaError(`CAPTCHA (AWS WAF) while fetching the event history of ${eventName}.`);
        }
        console.error(`Error fetching event history for ${eventName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return [];
    }
}

/*
* Fetches the results for a given event ID.
* Returns an object containing the event country, name, date, and an array of finish times in seconds.
* Event date can be in two different formats in the page. If date is in format dd/mm/yyyy, it is converted to yyyy-mm-dd. If date is in format yyyy-mm-dd, it is returned as is.
* Returns null rather than partial data (no finish times, page limit hit), because a saved event
* is never scraped again. Throws CaptchaError on a CAPTCHA, on any page.
*/
export async function getEventResults(countryCode: CountryCode, eventName: string, eventId: number): Promise<IEventResult | null> {
    const config = PARKRUN_EVENTS_PER_COUNTRY[countryCode];
    try {
        const startUrl = `${config.baseUrl}/${eventName}/results/${eventId}/`;
        const resultsPath = new URL(startUrl).pathname;
        console.log(`\nFetching results for ${eventName} event #${eventId}`);

        const finishTimes: number[] = [];
        let eventDate: string | null = null;

        // Follow pagination within this event's results until exhausted or max pages reached
        const visited = new Set<string>();
        let nextUrl: string | null = startUrl;

        while (nextUrl) {
            if (visited.size >= MAX_RESULT_PAGES) {
                console.error(`Stopped after ${MAX_RESULT_PAGES} result pages for ${eventName} event #${eventId}; skipping to avoid saving partial results.`);
                return null;
            }
            const currentUrl: string = nextUrl;
            visited.add(currentUrl);

            await delay(DELAY_MS);
            const response = await axios.get(currentUrl, {
                headers: HEADERS,
                timeout: 30000,
                maxRedirects: 5
            });

            if (isCaptchaPage(response.data)) {
                throw new CaptchaError(`CAPTCHA while fetching results of ${eventName} event #${eventId}.`);
            }

            const $ = cheerio.load(response.data);

            // Extract date once (prefer first page)
            if (!eventDate) {
                const dateText = $('.format-date').first().text().trim();
                const isoMatch = dateText.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (isoMatch) {
                    eventDate = isoMatch[0];
                } else {
                    const oldMatch = dateText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                    if (oldMatch) {
                        eventDate = `${oldMatch[3]}-${oldMatch[2]}-${oldMatch[1]}`;
                    } else {
                        // keep null and continue; we may find date on another page
                        console.warn('Could not find date in page:', dateText);
                    }
                }
            }

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

            nextUrl = findNextResultsPage($, currentUrl, resultsPath, visited);
        }

        if (!eventDate) {
            console.error('Could not determine event date for', eventId);
            return null;
        }

        if (finishTimes.length === 0) {
            console.error(`No finish times found for ${eventName} event #${eventId}; skipping.`);
            return null;
        }

        return {
            eventCountry: config.country,
            eventName,
            eventId,
            eventDate,
            finishTimes
        };

    } catch (error) {
        if (error instanceof CaptchaError) throw error;
        if (isWafCaptcha(error)) {
            throw new CaptchaError(`CAPTCHA (AWS WAF) while fetching results of ${eventName} event #${eventId}.`);
        } else {
            console.error(`Error fetching results for event #${eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return null;
    }
}

