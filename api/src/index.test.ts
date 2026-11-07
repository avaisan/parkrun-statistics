import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import * as dataService from './services/data.js';
import { handler } from './index.js';

vi.mock('./services/data.js');

const SOURCE_IP = '203.0.113.7';
const USER_AGENT = 'Mozilla/5.0 (secret-agent)';

function apiEvent(path: string, httpMethod = 'GET'): APIGatewayProxyEvent {
    return {
        httpMethod,
        path,
        headers: { 'User-Agent': USER_AGENT, 'X-Forwarded-For': SOURCE_IP },
        requestContext: { requestId: 'req-123', identity: { sourceIp: SOURCE_IP, userAgent: USER_AGENT } }
    } as unknown as APIGatewayProxyEvent;
}

async function invoke(path: string, httpMethod = 'GET'): Promise<APIGatewayProxyResult> {
    return (await handler(apiEvent(path, httpMethod), {} as Context, () => {})) as APIGatewayProxyResult;
}

describe('Lambda handler', () => {
    let consoleInfo: ReturnType<typeof vi.spyOn>;
    let consoleError: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
        consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(dataService.readLatestDate).mockResolvedValue({ latest_date: '2026-11-07' });
        vi.mocked(dataService.readEventStats).mockResolvedValue([{ eventName: 'puolarmaari' }]);
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('Given GET /api/events, When invoked, Then should return 200 with event_quarterly_stats', async () => {
        const response = await invoke('/api/events');

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ event_quarterly_stats: [{ eventName: 'puolarmaari' }] });
    });

    it('Given GET /api/latest-date, When invoked, Then should return 200 with the latest date', async () => {
        const response = await invoke('/api/latest-date');

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ latest_date: '2026-11-07' });
    });

    it('Given a path with duplicate or trailing slashes, When invoked, Then should still match the route', async () => {
        const response = await invoke('//api/events/');

        expect(response.statusCode).toBe(200);
    });

    it('Given a path that only contains a route name, When invoked, Then should return 404', async () => {
        const response = await invoke('/other/api/events');

        expect(response.statusCode).toBe(404);
        expect(dataService.readEventStats).not.toHaveBeenCalled();
    });

    it('Given a non-GET method, When invoked, Then should return 405', async () => {
        const response = await invoke('/api/events', 'POST');

        expect(response.statusCode).toBe(405);
    });

    it('Given an OPTIONS preflight, When invoked, Then should return 204 with CORS headers', async () => {
        const response = await invoke('/api/events', 'OPTIONS');

        expect(response.statusCode).toBe(204);
        expect(response.headers?.['Access-Control-Allow-Methods']).toBe('GET, OPTIONS');
    });

    it('Given ALLOWED_ORIGIN is set, When invoked, Then should allow only that origin', async () => {
        vi.stubEnv('ALLOWED_ORIGIN', 'https://parkrun.example.com');

        const response = await invoke('/api/health');

        expect(response.headers?.['Access-Control-Allow-Origin']).toBe('https://parkrun.example.com');
    });

    it('Given ALLOWED_ORIGIN is not set, When invoked, Then should allow any origin', async () => {
        const response = await invoke('/api/health');

        expect(response.headers?.['Access-Control-Allow-Origin']).toBe('*');
    });

    it('Given reading data fails, When invoked, Then should return a generic 500 without internal details', async () => {
        vi.mocked(dataService.readEventStats).mockRejectedValue(new Error('Failed to read event statistics', { cause: new Error('NoSuchBucket: parkrun-data') }));

        const response = await invoke('/api/events');

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body)).toEqual({ error: 'Internal server error' });
        expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('NoSuchBucket'));
    });

    it('Given a request with IP and user agent, When invoked, Then should log method, path and status but not personal data', async () => {
        await invoke('/api/events');

        const logged = consoleInfo.mock.calls.map((call: unknown[]) => String(call[0])).join('\n');
        expect(logged).toContain('"path":"/api/events"');
        expect(logged).toContain('"status":200');
        expect(logged).toContain('"requestId":"req-123"');
        expect(logged).not.toContain(SOURCE_IP);
        expect(logged).not.toContain(USER_AGENT);
    });
});
