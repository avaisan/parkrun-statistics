import { getHistoryofEvents, getEventResults } from './scraper.js';
import { PARKRUN_EVENTS_PER_COUNTRY, CountryCode } from './events.js';
import { saveEventResult, getStoredEventIds, disconnectDatabase } from './save_to_db.js';
import { processEvent, emptyRunStats, ScrapeInterruptedError, IEventProcessingDeps } from './process_event.js';
import { parseScraperArgs, IScraperOptions, USAGE } from './cli.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../.env'), quiet: true });

/*
  * Get the date from the command line argument.
  * If no date is provided, it defaults to 7 days ago.
*/ 
function getFromDate(dateString?: string): Date {
  if (dateString) {
    return new Date(dateString);
  }
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date;
}

const deps: IEventProcessingDeps = {
  getHistory: getHistoryofEvents,
  getResults: getEventResults,
  getStoredIds: getStoredEventIds,
  save: saveEventResult
};

/*
  * Main function to run the scraper.
  * Events are processed oldest first; events already in the database are not fetched again.
  * On a CAPTCHA the run stops; rerunning the same command continues where it stopped.
*/
function runSummary(stats: ReturnType<typeof emptyRunStats>): string {
  return `saved ${stats.saved}, already stored (not fetched) ${stats.alreadyStored}, already existed ${stats.duplicate}, invalid ${stats.invalid}, failed ${stats.failed}`;
}

async function main(options: IScraperOptions) {
  const stats = emptyRunStats();

  try {
    const fromDate = getFromDate(options.fromDate);
    const countriesToProcess = options.countryCode 
      ? [options.countryCode]
      : Object.keys(PARKRUN_EVENTS_PER_COUNTRY) as CountryCode[];

    for (const countryCode of countriesToProcess) {
      console.log(`Processing country: ${countryCode}`);
      const config = PARKRUN_EVENTS_PER_COUNTRY[countryCode];

      const eventsToProcess = options.eventName 
        ? [options.eventName]
        : config.events;

      for (const eventName of eventsToProcess) {
        console.log(`\nProcessing ${eventName}`);
        await processEvent(countryCode, eventName, fromDate, stats, deps);
      }
    }

    const summary = runSummary(stats);
    if (stats.failed > 0 || stats.invalid > 0) {
      console.error(`Scraping completed with problems: ${summary}. Failed events are retried on the next run.`);
      process.exitCode = 1;
    } else {
      console.log(`Scraping completed successfully: ${summary}`);
    }
  } catch (error) {
    if (error instanceof ScrapeInterruptedError) {
      console.error(`
${error.message} Stopped the run so no later events are scraped out of order.`);
      console.error(`So far: ${runSummary(stats)}.`);
      console.error('Rerun the same command once the CAPTCHA has cleared: stored events are skipped without being fetched.');
      console.error(`To continue only this event: npm run scraper -- --event ${error.eventName} --from ${error.resumeFrom}`);
      process.exitCode = 1;
      return;
    }
    console.error('Error:', error);
    // exitCode instead of process.exit() so the finally block still closes the database connection
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}


// CLI arguments: --country, --event, --from (validated against events.ts)
let options: IScraperOptions;
try {
  options = parseScraperArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  console.error(USAGE);
  process.exit(1);
}

main(options);
