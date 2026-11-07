import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

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

    it('Given production mode and stats in S3, When reading event stats, Then should return the stats from the data bucket', async () => {
            const { readEventStats } = await import('./data.js');
            
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

    it('Given production mode and stats in S3, When reading event stats, Then should return rows with all statistic fields', async () => {
            const { readEventStats } = await import('./data.js');
            
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

    it('Given S3 rejects the request, When reading event stats, Then should throw a read error', async () => {
            const { readEventStats } = await import('./data.js');
            
            mockS3Send.mockRejectedValueOnce(new Error('S3 Error'));
            await expect(readEventStats()).rejects.toThrow('Failed to read event statistics');
    });

    it('Given production mode and a latest date in S3, When reading latest date, Then should return it from the data bucket', async () => {
            const { readLatestDate } = await import('./data.js');
            
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

    it('Given production mode and a latest date in S3, When reading latest date, Then should return an object with a latest_date field', async () => {
            const { readLatestDate } = await import('./data.js');
            
            mockS3Send.mockResolvedValueOnce({
                Body: {
                    transformToString: () => JSON.stringify(mockLatestDate)
                }
            });

            const result = await readLatestDate();
            expect(result).toHaveProperty('latest_date');
            expect(new Date(result.latest_date)).toBeInstanceOf(Date);
    });

    it('Given S3 rejects the request, When reading latest date, Then should throw a read error', async () => {
            const { readLatestDate } = await import('./data.js');
            
            mockS3Send.mockRejectedValueOnce(new Error('S3 Error'));
            await expect(readLatestDate()).rejects.toThrow('Failed to read latest date');
    });
});

describe('Local data files in development mode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NODE_ENV = 'development';
        delete process.env.DATA_DIR;
    });

    afterEach(() => {
        delete process.env.DATA_DIR;
    });

    it('Given DATA_DIR is not set, When reading event stats, Then should read from the Docker mount path', async () => {
        const { readEventStats } = await import('./data.js');
        vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({ event_quarterly_stats: mockStats }));

        const result = await readEventStats();

        expect(readFile).toHaveBeenCalledWith(resolve('/app/data', 'parkrun_data.json'), 'utf-8');
        expect(result).toEqual(mockStats);
    });

    it('Given DATA_DIR is an absolute path, When reading event stats, Then should read from that folder', async () => {
        const { readEventStats } = await import('./data.js');
        const dataDir = resolve('/custom/data');
        process.env.DATA_DIR = dataDir;
        vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify({ event_quarterly_stats: mockStats }));

        await readEventStats();

        expect(readFile).toHaveBeenCalledWith(resolve(dataDir, 'parkrun_data.json'), 'utf-8');
    });

    it('Given DATA_DIR is a relative path, When reading latest date, Then should resolve it against the working directory', async () => {
        const { readLatestDate } = await import('./data.js');
        process.env.DATA_DIR = '../data';
        vi.mocked(readFile).mockResolvedValueOnce(JSON.stringify(mockLatestDate));

        const result = await readLatestDate();

        expect(readFile).toHaveBeenCalledWith(resolve(process.cwd(), '../data', 'latest_date.json'), 'utf-8');
        expect(result).toEqual(mockLatestDate);
    });

    it('Given the data file is missing, When reading latest date, Then should throw a read error', async () => {
        const { readLatestDate } = await import('./data.js');
        vi.spyOn(console, 'error').mockImplementation(() => {});
        process.env.DATA_DIR = '/missing';
        vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'));

        await expect(readLatestDate()).rejects.toThrow('Failed to read latest date');
    });
});
