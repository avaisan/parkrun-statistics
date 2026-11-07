import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processEvent, emptyRunStats, ScrapeInterruptedError, IEventProcessingDeps } from './process_event.js';
import { CaptchaError, type IEventHistory, type IEventResult } from './scraper.js';

const EVENT = 'puolarmaari';
const FROM = new Date('2026-10-01');

// Oldest first, as getHistoryofEvents returns it
const HISTORY: IEventHistory[] = [
    { eventId: 176, date: '2026-10-03' },
    { eventId: 177, date: '2026-10-10' },
    { eventId: 178, date: '2026-10-17' }
];

const resultFor = (eventId: number): IEventResult => ({
    eventCountry: 'Finland', eventName: EVENT, eventId, eventDate: '2026-10-03', finishTimes: [1200]
});

function makeDeps(overrides: Partial<IEventProcessingDeps> = {}): IEventProcessingDeps {
    return {
        getHistory: vi.fn(async () => HISTORY),
        getResults: vi.fn(async (_country, _name, eventId: number) => resultFor(eventId)),
        getStoredIds: vi.fn(async () => new Set<number>()),
        save: vi.fn(async () => 'saved' as const),
        ...overrides
    };
}

const fetchedIds = (deps: IEventProcessingDeps) => vi.mocked(deps.getResults).mock.calls.map(call => call[2]);

describe('Scraper: processEvent', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('Given new events, When processing, Then should fetch and save them oldest first', async () => {
        const deps = makeDeps();
        const stats = emptyRunStats();

        await processEvent('FI', EVENT, FROM, stats, deps);

        expect(fetchedIds(deps)).toEqual([176, 177, 178]);
        expect(stats.saved).toBe(3);
    });

    it('Given some events are already stored, When processing, Then should not fetch their results pages', async () => {
        const deps = makeDeps({ getStoredIds: vi.fn(async () => new Set([176, 177])) });
        const stats = emptyRunStats();

        await processEvent('FI', EVENT, FROM, stats, deps);

        expect(deps.getStoredIds).toHaveBeenCalledWith(EVENT, [176, 177, 178]);
        expect(fetchedIds(deps)).toEqual([178]);
        expect(stats).toMatchObject({ alreadyStored: 2, saved: 1 });
    });

    it('Given a CAPTCHA on the second event, When processing, Then should stop with the date of that event to resume from', async () => {
        const getResults = vi.fn(async (_country, _name, eventId: number) => {
            if (eventId === 177) throw new CaptchaError('CAPTCHA while fetching results.');
            return resultFor(eventId);
        });
        const deps = makeDeps({ getResults });
        const stats = emptyRunStats();

        const error = await processEvent('FI', EVENT, FROM, stats, deps).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ScrapeInterruptedError);
        expect(error).toMatchObject({ eventName: EVENT, resumeFrom: '2026-10-10' });
        expect(fetchedIds(deps)).toEqual([176, 177]);
        expect(stats.saved).toBe(1);
    });

    it('Given a CAPTCHA on the history page, When processing, Then should stop with the from date to resume from', async () => {
        const deps = makeDeps({ getHistory: vi.fn(async () => { throw new CaptchaError('CAPTCHA on history.'); }) });

        const error = await processEvent('FI', EVENT, FROM, emptyRunStats(), deps).catch((e: unknown) => e);

        expect(error).toMatchObject({ name: 'ScrapeInterruptedError', resumeFrom: '2026-10-01' });
        expect(deps.getResults).not.toHaveBeenCalled();
    });

    it('Given an event whose results cannot be read, When processing, Then should count it as failed and continue with the next', async () => {
        const deps = makeDeps({ getResults: vi.fn(async (_country, _name, eventId: number) => (eventId === 177 ? null : resultFor(eventId))) });
        const stats = emptyRunStats();

        await processEvent('FI', EVENT, FROM, stats, deps);

        expect(fetchedIds(deps)).toEqual([176, 177, 178]);
        expect(stats).toMatchObject({ saved: 2, failed: 1 });
    });

    it('Given no events since the from date, When processing, Then should not query the database or fetch results', async () => {
        const deps = makeDeps({ getHistory: vi.fn(async () => []) });

        await processEvent('FI', EVENT, FROM, emptyRunStats(), deps);

        expect(deps.getStoredIds).not.toHaveBeenCalled();
        expect(deps.getResults).not.toHaveBeenCalled();
    });
});
