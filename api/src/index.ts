import { APIGatewayProxyEvent, APIGatewayProxyHandler } from 'aws-lambda';
import { readEventStats, readLatestDate } from './services/data.js';

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    console.log('Event received:', JSON.stringify(event));
    
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        const path = event.path;
        let responseBody;
        
        console.log(`Processing request for path: ${path}`);
        
        if (path.includes('/api/events')) {
            try {
                const stats = await readEventStats();
                console.log(`Retrieved ${stats ? (Array.isArray(stats) ? stats.length : 'non-array') : 'null'} stats`);
                responseBody = { event_quarterly_stats: stats };
            } catch (error) {
                console.error('Error reading event stats:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Failed to retrieve event statistics',
                        details: error instanceof Error ? error.message : String(error)
                    })
                };
            }
        } else if (path.includes('/api/latest-date')) {
            try {
                const latestDate = await readLatestDate();
                console.log('Latest date:', latestDate);
                responseBody = latestDate;
            } catch (error) {
                console.error('Error reading latest date:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: 'Failed to retrieve latest date',
                        details: error instanceof Error ? error.message : String(error)
                    })
                };
            }
        } else if (path.includes('/api/health')) {
            responseBody = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                services: {
                    api: 'up'
                }
            };
        } else {
            console.log(`Unhandled path: ${path}`);
            return {
                statusCode: 404,
                headers,
                body: JSON.stringify({ error: 'Not found' })
            };
        }
        
        console.log('Sending response:', JSON.stringify(responseBody).substring(0, 200) + (JSON.stringify(responseBody).length > 200 ? '...' : ''));
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(responseBody)
        };
    } catch (error) {
        console.error('Unhandled error in Lambda handler:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error)
            })
        };
    }
};
