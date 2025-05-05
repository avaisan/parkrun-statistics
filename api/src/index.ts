import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { readEventStats, readLatestDate } from './services/data.js';

const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key'
};

interface IEventStats {
    event_quarterly_stats: unknown[];
}

interface IHealthCheck {
    status: string;
    timestamp: string;
    services: { api: string };
}

type RouteResponse = IEventStats | string | IHealthCheck;
type RouteHandler = () => Promise<RouteResponse>;

const routes: Record<string, RouteHandler> = {
    '/api/events': async () => {
        const stats = await readEventStats();
        return { event_quarterly_stats: stats };
    },
    '/api/latest-date': async () => {
        return await readLatestDate();
    },
    '/api/health': async () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: { api: 'up' }
    })
};

const createResponse = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
    statusCode,
    headers,
    body: JSON.stringify(body)
});

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    console.log('Event received:', JSON.stringify(event));

    if (event.httpMethod === 'OPTIONS') {
        return createResponse(200, '');
    }

    try {
        const route = Object.keys(routes).find(path => event.path.includes(path));
        
        if (!route) {
            return createResponse(404, { error: 'Not found' });
        }

        const result = await routes[route]();
        console.log('Response:', JSON.stringify(result).substring(0, 200));
        return createResponse(200, result);

    } catch (error) {
        console.error('Error processing request:', error);
        return createResponse(500, {
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};