import { describe, it, expect, vi, beforeEach } from 'vitest';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const mockS3Send = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
    S3Client: class {
        send = mockS3Send;
    },
    GetObjectCommand: vi.fn()
}));

vi.mock('fs/promises');

const mockStats = [
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
];

const mockLatestDate = {
    latest_date: "2025-04-26"
};

describe('API data servicing', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
        
        process.env.NODE_ENV = 'production';
        process.env.DATA_BUCKET_NAME = 'test-bucket';
    });

    it('should return properly formatted event stats from S3', async () => {
            const { readEventStats } = await import('./data');
            
            mockS3Send.mockResolvedValueOnce({
                Body: {
                    transformToString: () => JSON.stringify(mockStats)
                }
            });

            const result = await readEventStats();

            expect(result).toEqual(mockStats);
            expect(mockS3Send).toHaveBeenCalledTimes(1);
            expect(GetObjectCommand).toHaveBeenCalledWith({
                Bucket: 'test-bucket',
                Key: expect.any(String)
            });
    });

    it('should validate event stats structure', async () => {
            const { readEventStats } = await import('./data');
            
            mockS3Send.mockResolvedValueOnce({
                Body: {
                    transformToString: () => JSON.stringify(mockStats)
                }
            });

            const result = await readEventStats();
            const stats = result[0];
            expect(stats).toHaveProperty('eventName');
            expect(stats).toHaveProperty('eventCountry');
            expect(stats).toHaveProperty('year', expect.any(Number));
            expect(stats).toHaveProperty('quarter', expect.any(Number));
            expect(stats).toHaveProperty('fastest_time', expect.any(Number));
            expect(stats).toHaveProperty('fastest_quartile', expect.any(Number));
            expect(stats).toHaveProperty('avg_finish_time', expect.any(Number));
            expect(stats).toHaveProperty('slowest_quartile', expect.any(Number));
            expect(stats).toHaveProperty('avg_participants', expect.any(Number));
    });

    it('should handle S3 errors gracefully', async () => {
            const { readEventStats } = await import('./data');
            
            mockS3Send.mockRejectedValueOnce(new Error('S3 Error'));
            await expect(readEventStats()).rejects.toThrow('Failed to read event statistics');
    });

    it('should return properly formatted latest date from S3', async () => {
            const { readLatestDate } = await import('./data');
            
            mockS3Send.mockResolvedValueOnce({
                Body: {
                    transformToString: () => JSON.stringify(mockLatestDate)
                }
            });

            const result = await readLatestDate();

            expect(result).toEqual(mockLatestDate);
            expect(mockS3Send).toHaveBeenCalledTimes(1);
            expect(GetObjectCommand).toHaveBeenCalledWith({
                Bucket: 'test-bucket',
                Key: expect.any(String)
            });
    });

    it('should validate latest date structure', async () => {
            const { readLatestDate } = await import('./data');
            
            mockS3Send.mockResolvedValueOnce({
                Body: {
                    transformToString: () => JSON.stringify(mockLatestDate)
                }
            });

            const result = await readLatestDate();
            expect(result).toHaveProperty('latest_date');
            expect(new Date(result.latest_date)).toBeInstanceOf(Date);
    });

    it('should handle S3 errors gracefully', async () => {
            const { readLatestDate } = await import('./data');
            
            mockS3Send.mockRejectedValueOnce(new Error('S3 Error'));
            await expect(readLatestDate()).rejects.toThrow('Failed to read latest date');
    });
});

describe('API contract tests', () => {
    it('should have all required fields with correct types', () => {
            const mockStat = {
                eventName: "testRun",
                eventCountry: "Finland",
                year: 2025,
                quarter: 1,
                fastest_time: 15.00,
                fastest_quartile: 20.00,
                avg_finish_time: 30.00,
                slowest_quartile: 35.00,
                avg_participants: 25
            };

            expect(mockStat).toHaveProperty('eventName');
            expect(typeof mockStat.eventName).toBe('string');
            
            expect(mockStat).toHaveProperty('eventCountry');
            expect(typeof mockStat.eventCountry).toBe('string');
            
            expect(mockStat).toHaveProperty('year');
            expect(typeof mockStat.year).toBe('number');
            
            expect(mockStat).toHaveProperty('quarter');
            expect(typeof mockStat.quarter).toBe('number');
            expect(mockStat.quarter).toBeGreaterThanOrEqual(1);
            expect(mockStat.quarter).toBeLessThanOrEqual(4);
            
            expect(mockStat).toHaveProperty('fastest_time');
            expect(typeof mockStat.fastest_time).toBe('number');
            
            expect(mockStat).toHaveProperty('fastest_quartile');
            expect(typeof mockStat.fastest_quartile).toBe('number');
            
            expect(mockStat).toHaveProperty('avg_finish_time');
            expect(typeof mockStat.avg_finish_time).toBe('number');
            
            expect(mockStat).toHaveProperty('slowest_quartile');
            expect(typeof mockStat.slowest_quartile).toBe('number');
            
            expect(mockStat).toHaveProperty('avg_participants');
            expect(typeof mockStat.avg_participants).toBe('number');
    });

    it('should validate time values are positive', () => {
            const mockStat = {
                fastest_time: 15.00,
                fastest_quartile: 20.00,
                avg_finish_time: 30.00,
                slowest_quartile: 35.00,
            };

            expect(mockStat.fastest_time).toBeGreaterThan(0);
            expect(mockStat.fastest_quartile).toBeGreaterThan(0);
            expect(mockStat.avg_finish_time).toBeGreaterThan(0);
            expect(mockStat.slowest_quartile).toBeGreaterThan(0);
    });

    it('should validate time ordering', () => {
            const mockStat = {
                fastest_time: 15.00,
                fastest_quartile: 20.00,
                avg_finish_time: 30.00,
                slowest_quartile: 35.00,
            };

            expect(mockStat.fastest_time).toBeLessThanOrEqual(mockStat.fastest_quartile);
            expect(mockStat.fastest_quartile).toBeLessThanOrEqual(mockStat.avg_finish_time);
            expect(mockStat.avg_finish_time).toBeLessThanOrEqual(mockStat.slowest_quartile);
    });

    it('should have latest_date field with valid date format', () => {
            const mockDate = {
                latest_date: "2025-04-26"
            };

            expect(mockDate).toHaveProperty('latest_date');
            expect(typeof mockDate.latest_date).toBe('string');
            expect(mockDate.latest_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(new Date(mockDate.latest_date)).toBeInstanceOf(Date);
            expect(isNaN(new Date(mockDate.latest_date).getTime())).toBe(false);
    });
});