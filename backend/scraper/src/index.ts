import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { PrismaClient } from '@prisma/client';
import { ScheduledEvent } from 'aws-lambda';
import { getHistoryofEvents, getEventResults } from './scraper';
import { PARKRUN_EVENTS_PER_COUNTRY, CountryCode } from './events';
import { saveEventResult } from './save_to_db';

const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION });

async function getDatabaseCredentials() {
  const command = new GetSecretValueCommand({
    SecretId: process.env.DATABASE_SECRET_ARN!
  });
  
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString!);
}

export const handler = async (event: ScheduledEvent) => {
  try {
    const credentials = await getDatabaseCredentials();
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: credentials.DATABASE_URL
        }
      }
    });

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);

    for (const countryCode of Object.keys(PARKRUN_EVENTS_PER_COUNTRY) as CountryCode[]) {
      console.log(`Processing country: ${countryCode}`);
      const config = PARKRUN_EVENTS_PER_COUNTRY[countryCode];
      for (const eventName of config.events) {
        console.log(`\nProcessing ${eventName}`);
        
        const eventHistory = await getHistoryofEvents(countryCode, eventName, fromDate);
        
        if (eventHistory.length === 0) {
          console.log(`No events found for ${eventName} since ${fromDate.toISOString().split('T')[0]}`);
          continue;
        }

        for (const event of eventHistory) {
          const eventResult = await getEventResults(countryCode, eventName, event.eventId);
          
          if (eventResult) {
            console.log(`Found ${eventResult.finishTimes.length} results for event #${event.eventId}`);
            await saveEventResult(eventResult);
          }
        }
      }
    }

    await prisma.$disconnect();
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Scraping completed successfully' })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to process events' })
    };
  }
};