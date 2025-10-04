import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { getQuarterlyStats, getLatestEventDate } from './api';

vi.mock('axios');

describe('Frontend API tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return quarterly stats array', async () => {
            const mockData = {
                event_quarterly_stats: [
                    {
                        eventName: "testRun",
                        eventCountry: "Finland",
                        year: 2025,
                        quarter: 1,
                        fastest_time: 15.00,
                        fastest_quartile: 20.00,
                        avg_finish_time: 30.00,
                        slowest_quartile: 35.00,
                        avg_participants: 25
                    }
                ]
            };

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockData });

            const result = await getQuarterlyStats();

            expect(result).toEqual(mockData.event_quarterly_stats);
            expect(Array.isArray(result)).toBe(true);
    });

    it('should validate response structure', async () => {
            const mockData = {
                event_quarterly_stats: [
                    {
                        eventName: "testRun",
                        eventCountry: "Finland",
                        year: 2025,
                        quarter: 1,
                        fastest_time: 15.00,
                        fastest_quartile: 20.00,
                        avg_finish_time: 30.00,
                        slowest_quartile: 35.00,
                        avg_participants: 25
                    }
                ]
            };

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockData });

            const result = await getQuarterlyStats();
            const stat = result[0];

            expect(stat).toHaveProperty('eventName');
            expect(stat).toHaveProperty('eventCountry');
            expect(stat).toHaveProperty('year');
            expect(stat).toHaveProperty('quarter');
            expect(stat).toHaveProperty('fastest_time');
            expect(stat).toHaveProperty('fastest_quartile');
            expect(stat).toHaveProperty('avg_finish_time');
            expect(stat).toHaveProperty('slowest_quartile');
            expect(stat).toHaveProperty('avg_participants');
    });

    it('should throw error on API failure', async () => {
            vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

            await expect(getQuarterlyStats()).rejects.toThrow();
    });

    it('should return latest date object', async () => {
            const mockData = {
                latest_date: "2025-04-26"
            };

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockData });

            const result = await getLatestEventDate();

            expect(result).toEqual(mockData);
            expect(result).toHaveProperty('latest_date');
    });

    it('should validate date format', async () => {
            const mockData = {
                latest_date: "2025-04-26"
            };

            vi.mocked(axios.get).mockResolvedValueOnce({ data: mockData });

            const result = await getLatestEventDate();

            expect(result.latest_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(new Date(result.latest_date)).toBeInstanceOf(Date);
    });

    it('should throw error on API failure', async () => {
            vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

            await expect(getLatestEventDate()).rejects.toThrow();
    });
});
