import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from './generated/prisma/client.js';
import type { IEventResult } from './scraper.js';

const mockCreate = vi.fn();
const mockFindMany = vi.fn();
const mockDisconnect = vi.fn();
const mockPoolEnd = vi.fn();

// Real Prisma error classes, mocked client and connection pool (no database is touched).
vi.mock('./generated/prisma/client.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./generated/prisma/client.js')>();
    return {
        ...actual,
        PrismaClient: class {
            event = { create: mockCreate, findMany: mockFindMany };
            $disconnect = mockDisconnect;
        }
    };
});
vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: class {} }));
vi.mock('pg', () => ({ default: { Pool: class { end = mockPoolEnd; } } }));

vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5433/test');
const { saveEventResult, getStoredEventIds, disconnectDatabase } = await import('./save_to_db.js');

const CLIENT_VERSION = '7.10.1';
const eventResult: IEventResult = {
    eventCountry: 'Finland',
    eventName: 'puolarmaari',
    eventId: 181,
    eventDate: '2026-11-07',
    finishTimes: [1200, 1500, 1800]
};

describe('Scraper: saveEventResult', () => {
    let consoleError: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('Given a new event, When saving, Then should store it with average and fastest time in minutes and report saved', async () => {
        mockCreate.mockResolvedValueOnce({});

        const outcome = await saveEventResult(eventResult);

        expect(outcome).toBe('saved');
        expect(mockCreate).toHaveBeenCalledWith({
            data: {
                eventId: 181,
                eventName: 'puolarmaari',
                eventCountry: 'Finland',
                eventDate: new Date('2026-11-07'),
                finishTimes: [1200, 1500, 1800],
                avgFinishTimeInMin: 25,
                fastestFinishTimeInMin: 20
            }
        });
    });

    it('Given the event already exists, When saving, Then should report duplicate without logging an error', async () => {
        mockCreate.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: CLIENT_VERSION }));

        const outcome = await saveEventResult(eventResult);

        expect(outcome).toBe('duplicate');
        expect(consoleError).not.toHaveBeenCalled();
    });

    it('Given the database is unreachable, When saving, Then should report failed and log the Prisma error code', async () => {
        mockCreate.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Can't reach database server", { code: 'P1001', clientVersion: CLIENT_VERSION }));

        const outcome = await saveEventResult(eventResult);

        expect(outcome).toBe('failed');
        expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('(P1001)'));
    });

    it('Given an unexpected non-Prisma error, When saving, Then should report failed and log the message', async () => {
        mockCreate.mockRejectedValueOnce(new Error('connection reset'));

        const outcome = await saveEventResult(eventResult);

        expect(outcome).toBe('failed');
        expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('connection reset'));
    });

    it('Given an event without finish times, When saving, Then should report invalid and not write to the database', async () => {
        const outcome = await saveEventResult({ ...eventResult, finishTimes: [] });

        expect(outcome).toBe('invalid');
        expect(mockCreate).not.toHaveBeenCalled();
    });

    it('Given an open database connection, When disconnecting, Then should close both the Prisma client and the pool', async () => {
        await disconnectDatabase();

        expect(mockDisconnect).toHaveBeenCalledTimes(1);
        expect(mockPoolEnd).toHaveBeenCalledTimes(1);
    });

    it('Given some event numbers, When looking up stored events, Then should query by event name and numbers and return the stored ones', async () => {
        mockFindMany.mockResolvedValueOnce([{ eventId: 176 }, { eventId: 178 }]);

        const stored = await getStoredEventIds('puolarmaari', [176, 177, 178]);

        expect(stored).toEqual(new Set([176, 178]));
        expect(mockFindMany).toHaveBeenCalledWith({
            where: { eventName: 'puolarmaari', eventId: { in: [176, 177, 178] } },
            select: { eventId: true }
        });
    });

    it('Given no event numbers, When looking up stored events, Then should return an empty set without querying', async () => {
        const stored = await getStoredEventIds('puolarmaari', []);

        expect(stored.size).toBe(0);
        expect(mockFindMany).not.toHaveBeenCalled();
    });
});
