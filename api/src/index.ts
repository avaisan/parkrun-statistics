import type { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { readEventStats, readLatestDate } from './services/data.js';
import { PATHS } from './config.js';

interface IEventStats {
    event_quarterly_stats: unknown[];
}

interface ILatestDate {
    latest_date: string;
}

interface IHealthCheck {
    status: string;
    timestamp: string;
    services: { api: string };
}

type RouteResponse = IEventStats | ILatestDate | IHealthCheck;
type RouteHandler = () => Promise<RouteResponse>;

const routes: Record<string, RouteHandler> = {
    [PATHS.EVENTS]: async () => ({ event_quarterly_stats: await readEventStats() }),
    [PATHS.LATEST_DATE]: async () => await readLatestDate(),
    [PATHS.HEALTH]: async () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: { api: 'up' }
    })
};

/** CORS origin: the site's own domain in AWS (set by CDK), any origin when unset (local use). */
function corsHeaders(): Record<string, string> {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key'
    };
}

const createResponse = (statusCode: number, body?: unknown): APIGatewayProxyResult => ({
    statusCode,
    headers: corsHeaders(),
    body: body === undefined ? '' : JSON.stringify(body)
});

/** Collapses duplicate slashes and drops a trailing slash, so `//api/events/` matches `/api/events`. */
function normalizePath(path: string): string {
    const collapsed = path.replace(/\/{2,}/g, '/');
    return collapsed.length > 1 ? collapsed.replace(/\/$/, '') : collapsed;
}

/*
 * Logs one JSON line per request: method, path, status, duration and request id only.
 * Headers, source IP and user agent are deliberately not logged (personal data).
 */
function logRequest(event: APIGatewayProxyEvent, statusCode: number, startedAt: number): void {
    console.info(JSON.stringify({
        msg: 'request',
        method: event.httpMethod,
        path: event.path,
        status: statusCode,
        durationMs: Date.now() - startedAt,
        requestId: event.requestContext?.requestId
    }));
}

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {
    const startedAt = Date.now();
    const respond = (statusCode: number, body?: unknown) => {
        logRequest(event, statusCode, startedAt);
        return createResponse(statusCode, body);
    };

    if (event.httpMethod === 'OPTIONS') {
        return respond(204);
    }
    if (event.httpMethod !== 'GET') {
        return respond(405, { error: 'Method not allowed' });
    }

    const route = routes[normalizePath(event.path ?? '')];
    if (!route) {
        return respond(404, { error: 'Not found' });
    }

    try {
        return respond(200, await route());
    } catch (error) {
        // Details stay in the logs; the client only gets a generic message.
        console.error(JSON.stringify({
            msg: 'request failed',
            path: event.path,
            requestId: event.requestContext?.requestId,
            error: error instanceof Error ? error.message : String(error),
            cause: error instanceof Error && error.cause instanceof Error ? error.cause.message : undefined
        }));
        return respond(500, { error: 'Internal server error' });
    }
};
