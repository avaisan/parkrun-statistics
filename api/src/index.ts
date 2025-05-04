import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { readEventStats, readLatestDate } from './services/data.js';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
  try {
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
  } catch (error: unknown) {
    console.error('Error handling request:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};