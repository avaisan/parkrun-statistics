import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { readEventStats, readLatestDate } from './services/data.js';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    const path = event.path;
    let responseBody;
    
    if (path.includes('/api/events')) {
      responseBody = await readEventStats();
    } else if (path.includes('/api/latest-date')) {
      responseBody = await readLatestDate();
    } else if (path.includes('/api/health')) {
      responseBody = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          api: 'up'
        }
      };
    } else {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Not found' })
      };
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(responseBody)
    };
};