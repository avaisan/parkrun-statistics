import { PrismaClient } from '@prisma/client';
import { getHistoryofEvents, getEventResults } from './scraper.js';
import { PARKRUN_EVENTS_PER_COUNTRY, CountryCode } from './events.js';
import { saveEventResult } from './save_to_db.js';

interface IScraperOptions {
  countryCode?: CountryCode;
  eventName?: string;
  fromDate?: string;
}

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

/*
  * Process each event for the given country code.
  * Fetch the event history and results, then save to the database.
*/
async function processEvent(countryCode: CountryCode, eventName: string, fromDate: Date) {
  const eventHistory = await getHistoryofEvents(countryCode, eventName, fromDate);
  
  if (eventHistory.length === 0) {
    console.log(`No events found for ${eventName} since ${fromDate.toISOString().split('T')[0]}`);
    return;
  }

  for (const event of eventHistory) {
    const eventResult = await getEventResults(countryCode, eventName, event.eventId);
    
    if (eventResult) {
      console.log(`Found ${eventResult.finishTimes.length} results for event #${event.eventId}`);
      await saveEventResult(eventResult);
    }
  }
}

/*
  * Main function to run the scraper.
  * It connects to the database, calls function processEvent for each event,
  * and saves the results to the database.
  * If event already exists, it will not be saved again.
*/
async function main(options: IScraperOptions) {
  const prisma = new PrismaClient();

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
        await processEvent(countryCode, eventName, fromDate);
      }
    }

    console.log('Scraping completed successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}


// CLI arguments for country code and date
const args = process.argv.slice(2);
const options: IScraperOptions = {};

for (let i = 0; i < args.length; i += 2) {
  switch (args[i]) {
    case '--country':
      options.countryCode = args[i + 1] as CountryCode;
      break;
    case '--event':
      options.eventName = args[i + 1];
      break;
    case '--from':
      options.fromDate = args[i + 1];
      break;
  }
}


main(options);
