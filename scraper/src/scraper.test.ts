import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { getEventResults, getHistoryofEvents, CaptchaError } from './scraper.js';

vi.mock('axios');

const BASE = 'https://www.parkrun.fi';
const EVENT = 'puolarmaari';
const EVENT_ID = 100;
const resultsUrl = (path = '') => `${BASE}/${EVENT}/results/${EVENT_ID}/${path}`;

/** Builds a minimal results page: date header, rows with the time in the 6th column, optional extra links. */
function resultsPage(times: string[], { date = '2026-11-07', links = '' }: { date?: string; links?: string } = {}): string {
    const rows = times
        .map(time => `<tr><td>1</td><td>Runner</td><td>M</td><td>SM30</td><td>Club</td><td>${time}</td></tr>`)
        .join('');
    return `<html><body>
        <h3><span class="format-date">${date}</span></h3>
        <table class="Results-table"><tbody>${rows}</tbody></table>
        ${links}
    </body></html>`;
}

function servePages(pages: Record<string, string>) {
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
        if (!(url in pages)) throw new Error(`Unexpected request: ${url}`);
        return { data: pages[url] };
    });
}

/** Settles a promise while fast-forwarding the scraper's delays; the handler is attached first, so rejections are never unhandled. */
async function settle<T>(promise: Promise<T>): Promise<{ value?: T; error?: unknown }> {
    const settled = promise.then(value => ({ value }), (error: unknown) => ({ error }));
    await vi.runAllTimersAsync();
    return settled;
}

/** Runs getEventResults while fast-forwarding the scraper's politeness delays. */
async function scrape() {
    const promise = getEventResults('FI', EVENT, EVENT_ID);
    await vi.runAllTimersAsync();
    return promise;
}

describe('Scraper: getEventResults', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('Given a single results page, When scraping an event, Then should return its date and finish times in seconds', async () => {
        servePages({ [resultsUrl()]: resultsPage(['17:05', '1:02:03']) });

        const result = await scrape();

        expect(result).toEqual({
            eventCountry: 'Finland',
            eventName: EVENT,
            eventId: EVENT_ID,
            eventDate: '2026-11-07',
            finishTimes: [17 * 60 + 5, 3600 + 2 * 60 + 3]
        });
    });

    it('Given a dd/mm/yyyy date, When scraping an event, Then should convert it to yyyy-mm-dd', async () => {
        servePages({ [resultsUrl()]: resultsPage(['20:00'], { date: '07/11/2026' }) });

        const result = await scrape();

        expect(result?.eventDate).toBe('2026-11-07');
    });

    it('Given results split over two pages of the same event, When scraping, Then should combine the times from both pages', async () => {
        servePages({
            [resultsUrl()]: resultsPage(['18:00'], { links: `<a rel="next" href="${resultsUrl('?page=2')}">Next</a>` }),
            [resultsUrl('?page=2')]: resultsPage(['25:00'])
        });

        const result = await scrape();

        expect(result?.finishTimes).toEqual([18 * 60, 25 * 60]);
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('Given a "next" link pointing to a different event, When scraping, Then should not follow it or merge its runners', async () => {
        servePages({
            [resultsUrl()]: resultsPage(['18:00'], { links: `<a href="/${EVENT}/results/${EVENT_ID + 1}/">›</a>` })
        });

        const result = await scrape();

        expect(result?.finishTimes).toEqual([18 * 60]);
        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    it('Given pages that link back to an already visited page, When scraping, Then should stop without refetching', async () => {
        servePages({
            [resultsUrl()]: resultsPage(['18:00'], { links: `<a rel="next" href="${resultsUrl('?page=2')}">Next</a>` }),
            [resultsUrl('?page=2')]: resultsPage(['25:00'], { links: `<a rel="next" href="${resultsUrl()}">Next</a>` })
        });

        const result = await scrape();

        expect(result?.finishTimes).toEqual([18 * 60, 25 * 60]);
        expect(axios.get).toHaveBeenCalledTimes(2);
    });

    it('Given a CAPTCHA on a later page, When scraping, Then should throw CaptchaError instead of returning partial results', async () => {
        servePages({
            [resultsUrl()]: resultsPage(['18:00'], { links: `<a rel="next" href="${resultsUrl('?page=2')}">Next</a>` }),
            [resultsUrl('?page=2')]: '<html><body>Human Verification required</body></html>'
        });

        const { error } = await settle(getEventResults('FI', EVENT, EVENT_ID));
        expect(error).toBeInstanceOf(CaptchaError);
    });

    it('Given AWS WAF answers with a captcha action, When scraping, Then should throw CaptchaError', async () => {
        vi.mocked(axios.get).mockRejectedValue(Object.assign(new Error('Request failed with status code 405'), { response: { headers: { 'x-amzn-waf-action': 'captcha' } } }));
        vi.mocked(axios.isAxiosError).mockReturnValue(true);

        const { error } = await settle(getEventResults('FI', EVENT, EVENT_ID));
        expect(error).toBeInstanceOf(CaptchaError);
    });

    it('Given a results page without any finish times, When scraping, Then should return null', async () => {
        servePages({ [resultsUrl()]: resultsPage([]) });

        const result = await scrape();

        expect(result).toBeNull();
    });

    it('Given a page without a recognizable date, When scraping, Then should return null', async () => {
        servePages({ [resultsUrl()]: resultsPage(['18:00'], { date: 'unknown' }) });

        const result = await scrape();

        expect(result).toBeNull();
    });

    it('Given the request fails, When scraping, Then should return null', async () => {
        vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

        const result = await scrape();

        expect(result).toBeNull();
    });
});

/** Event history page as parkrun lists it: newest event first. */
function historyPage(events: Array<{ id: number; date: string }>): string {
    const rows = events
        .map(e => `<tr class="Results-table-row" data-parkrun="${e.id}" data-date="${e.date}"><td>${e.id}</td></tr>`)
        .join('');
    return `<html><body><table class="Results-table"><tbody>${rows}</tbody></table></body></html>`;
}

describe('Scraper: getHistoryofEvents', () => {
    const historyUrl = `${BASE}/${EVENT}/results/eventhistory/`;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    async function history(fromDate: string) {
        const promise = getHistoryofEvents('FI', EVENT, new Date(fromDate));
        await vi.runAllTimersAsync();
        return promise;
    }

    it('Given a history listed newest first, When fetching events since a date, Then should return only those events oldest first', async () => {
        servePages({
            [historyUrl]: historyPage([
                { id: 181, date: '2026-11-07' },
                { id: 180, date: '2026-10-31' },
                { id: 179, date: '2026-10-24' },
                { id: 178, date: '2026-10-17' }
            ])
        });

        const events = await history('2026-10-24');

        expect(events).toEqual([
            { eventId: 179, date: '2026-10-24' },
            { eventId: 180, date: '2026-10-31' },
            { eventId: 181, date: '2026-11-07' }
        ]);
    });

    it('Given a CAPTCHA on the history page, When fetching events, Then should throw CaptchaError instead of returning no events', async () => {
        servePages({ [historyUrl]: '<html><body>captcha</body></html>' });

        const { error } = await settle(getHistoryofEvents('FI', EVENT, new Date('2026-10-01')));
        expect(error).toBeInstanceOf(CaptchaError);
    });
});
