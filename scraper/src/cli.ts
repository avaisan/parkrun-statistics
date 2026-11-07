import { PARKRUN_EVENTS_PER_COUNTRY, CountryCode } from './events.js';

export interface IScraperOptions {
  countryCode?: CountryCode;
  eventName?: string;
  fromDate?: string;
}

export const USAGE = 'Usage: npm run scraper -- [--country FI|SE|NO|DK] [--event <name>] [--from YYYY-MM-DD]';

const FLAGS = {
  '--country': 'countryCode',
  '--event': 'eventName',
  '--from': 'fromDate'
} as const satisfies Record<string, keyof IScraperOptions>;

type Flag = keyof typeof FLAGS;

function isFlag(value: string): value is Flag {
  return Object.prototype.hasOwnProperty.call(FLAGS, value);
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

/**
 * Parses and validates scraper CLI arguments against the events in `events.ts`.
 * - Country codes are case-insensitive and must be configured.
 * - Event names must be listed in `events.ts`. With `--event` alone, the country is
 *   resolved from the list, so only that country's site is requested.
 * - `--from` must be a real calendar date in YYYY-MM-DD form.
 * Throws an Error with a user-facing message on invalid input.
 */
export function parseScraperArgs(args: string[]): IScraperOptions {
  const options: IScraperOptions = {};

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    if (!isFlag(flag)) {
      throw new Error(`Unknown option "${flag}".`);
    }
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${flag}.`);
    }
    options[FLAGS[flag]] = value;
  }

  const countryCodes = Object.keys(PARKRUN_EVENTS_PER_COUNTRY);

  if (options.countryCode !== undefined) {
    const code = options.countryCode.toUpperCase();
    if (!countryCodes.includes(code)) {
      throw new Error(`Unknown country "${options.countryCode}". Use one of: ${countryCodes.join(', ')}.`);
    }
    options.countryCode = code;
  }

  if (options.eventName !== undefined) {
    const name = options.eventName.toLowerCase();
    const searchIn = options.countryCode ? [options.countryCode] : countryCodes;
    const owner = searchIn.find(code => PARKRUN_EVENTS_PER_COUNTRY[code].events.includes(name));
    if (!owner) {
      const where = options.countryCode ? `for country ${options.countryCode}` : 'in any country';
      throw new Error(`Unknown event "${options.eventName}" ${where}. Check the spelling or add it to scraper/src/events.ts.`);
    }
    options.eventName = name;
    options.countryCode = owner;
  }

  if (options.fromDate !== undefined && !isValidIsoDate(options.fromDate)) {
    throw new Error(`Invalid --from date "${options.fromDate}". Use a real date in YYYY-MM-DD form.`);
  }

  return options;
}
