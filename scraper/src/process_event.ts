import type { CountryCode } from './events.js';
import { CaptchaError, type IEventHistory, type IEventResult } from './scraper.js';
import type { SaveOutcome } from './save_to_db.js';

/** Per-run counters: save outcomes plus events skipped because they were already stored. */
export type RunStats = Record<SaveOutcome | 'alreadyStored', number>;

export function emptyRunStats(): RunStats {
    return { saved: 0, duplicate: 0, invalid: 0, failed: 0, alreadyStored: 0 };
}

/** Injected so processing can be tested without network or database. */
export interface IEventProcessingDeps {
    getHistory(countryCode: CountryCode, eventName: string, fromDate: Date): Promise<IEventHistory[]>;
    getResults(countryCode: CountryCode, eventName: string, eventId: number): Promise<IEventResult | null>;
    getStoredIds(eventName: string, eventIds: number[]): Promise<Set<number>>;
    save(eventResult: IEventResult): Promise<SaveOutcome>;
}

/**
 * The run stopped because of a CAPTCHA. Everything before `resumeFrom` (the date of the first
 * event that was not processed) is stored, because events are processed oldest first.
 */
export class ScrapeInterruptedError extends Error {
    constructor(message: string, readonly eventName: string, readonly resumeFrom: string) {
        super(message);
        this.name = 'ScrapeInterruptedError';
    }
}

const isoDate = (date: Date) => date.toISOString().split('T')[0];

/**
 * Scrapes one event series from fromDate onwards, oldest first:
 * 1. fetch the event history (one request),
 * 2. skip events already in the database (one query, no results-page requests),
 * 3. fetch and save the rest in ascending order.
 * Stops with ScrapeInterruptedError on the first CAPTCHA, so stored events form a contiguous range.
 */
export async function processEvent(
    countryCode: CountryCode,
    eventName: string,
    fromDate: Date,
    stats: RunStats,
    deps: IEventProcessingDeps
): Promise<void> {
    let history: IEventHistory[];
    try {
        history = await deps.getHistory(countryCode, eventName, fromDate);
    } catch (error) {
        if (error instanceof CaptchaError) {
            throw new ScrapeInterruptedError(error.message, eventName, isoDate(fromDate));
        }
        throw error;
    }

    if (history.length === 0) {
        console.log(`No events found for ${eventName} since ${isoDate(fromDate)}`);
        return;
    }

    const stored = await deps.getStoredIds(eventName, history.map(event => event.eventId));
    const toFetch = history.filter(event => !stored.has(event.eventId));
    stats.alreadyStored += history.length - toFetch.length;
    if (stored.size > 0) {
        console.log(`${history.length - toFetch.length} of ${history.length} events already stored; not fetching them`);
    }

    for (const event of toFetch) {
        let eventResult: IEventResult | null;
        try {
            eventResult = await deps.getResults(countryCode, eventName, event.eventId);
        } catch (error) {
            if (error instanceof CaptchaError) {
                throw new ScrapeInterruptedError(error.message, eventName, event.date);
            }
            throw error;
        }

        if (eventResult) {
            console.log(`Found ${eventResult.finishTimes.length} results for event #${event.eventId}`);
            stats[await deps.save(eventResult)] += 1;
        } else {
            // Already logged by getResults; not stored, so the next run retries it
            stats.failed += 1;
        }
    }
}
