import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import * as dataService from '../services/data.js'

vi.mock('../services/data.js');

const mockStats = [
    {
        eventName: "testRun",
        eventCountry: "Finland",
        year: 2025,
        quarter: 1,
        fastest_time: 20.00,
        fastest_quartile: 25.00,
        avg_finish_time: 30.00,
        slowest_quartile: 35.00,
        avg_participants: 25
    }
];

describe('Events API endpoints', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    describe('GET /api/events', () => {
        it('Given event stats are available, When GET /api/events is requested, Then should return 200 with event_quarterly_stats in the expected shape', async () => {
            vi.spyOn(dataService, 'readEventStats').mockResolvedValue(mockStats);

            const response = await request(app)
                .get('/api/events')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('event_quarterly_stats');
            expect(Array.isArray(response.body.event_quarterly_stats)).toBe(true);
            
            const event = response.body.event_quarterly_stats[0];
            expect(event).toHaveProperty('eventName');
            expect(event).toHaveProperty('eventCountry');
            expect(event).toHaveProperty('year');
            expect(event).toHaveProperty('quarter');
            expect(event).toHaveProperty('fastest_time');
            expect(event).toHaveProperty('fastest_quartile');
            expect(event).toHaveProperty('avg_finish_time');
            expect(event).toHaveProperty('slowest_quartile');
            expect(event).toHaveProperty('avg_participants');
        });

        it('Given reading event stats fails, When GET /api/events is requested, Then should return 500 with an error body', async () => {
            vi.spyOn(dataService, 'readEventStats')
                .mockRejectedValue(new Error('Failed to read stats'));

            const response = await request(app)
                .get('/api/events')
                .expect('Content-Type', /json/)
                .expect(500);

            expect(response.body).toHaveProperty('error');
        });
    });
});