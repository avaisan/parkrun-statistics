import { describe, it, expect } from 'vitest';
import { parseScraperArgs } from './cli.js';

describe('Scraper CLI: parseScraperArgs', () => {
    it('Given no arguments, When parsing, Then should return empty options (all countries, last 7 days)', () => {
        expect(parseScraperArgs([])).toEqual({});
    });

    it('Given a valid country, event and date, When parsing, Then should return them as options', () => {
        const options = parseScraperArgs(['--country', 'SE', '--event', 'orebro', '--from', '2026-08-02']);

        expect(options).toEqual({ countryCode: 'SE', eventName: 'orebro', fromDate: '2026-08-02' });
    });

    it('Given a lowercase country code and mixed-case event, When parsing, Then should normalize them', () => {
        const options = parseScraperArgs(['--country', 'fi', '--event', 'Valkeinen']);

        expect(options).toEqual({ countryCode: 'FI', eventName: 'valkeinen' });
    });

    it('Given an event without a country, When parsing, Then should resolve the country that lists the event', () => {
        const options = parseScraperArgs(['--event', 'orebro']);

        expect(options).toEqual({ countryCode: 'SE', eventName: 'orebro' });
    });

    it('Given an unknown country code, When parsing, Then should throw listing the valid codes', () => {
        expect(() => parseScraperArgs(['--country', 'XX'])).toThrow('Unknown country "XX". Use one of: FI, SE, NO, DK.');
    });

    it('Given an event that is not listed for the given country, When parsing, Then should throw naming the country', () => {
        expect(() => parseScraperArgs(['--country', 'FI', '--event', 'orebro'])).toThrow('Unknown event "orebro" for country FI');
    });

    it('Given an event that is not listed anywhere, When parsing, Then should throw pointing to events.ts', () => {
        expect(() => parseScraperArgs(['--event', 'nosuchrun'])).toThrow(/Unknown event "nosuchrun" in any country\. .*events\.ts/);
    });

    it.each(['2026-13-01', '2026-02-30', '02.08.2026', 'yesterday'])(
        'Given the invalid --from date %s, When parsing, Then should throw',
        (date) => {
            expect(() => parseScraperArgs(['--from', date])).toThrow(`Invalid --from date "${date}"`);
        }
    );

    it('Given an unknown option, When parsing, Then should throw naming the option', () => {
        expect(() => parseScraperArgs(['--county', 'FI'])).toThrow('Unknown option "--county".');
    });

    it('Given an option without a value, When parsing, Then should throw a missing value error', () => {
        expect(() => parseScraperArgs(['--country'])).toThrow('Missing value for --country.');
        expect(() => parseScraperArgs(['--country', '--from', '2026-08-02'])).toThrow('Missing value for --country.');
    });
});
