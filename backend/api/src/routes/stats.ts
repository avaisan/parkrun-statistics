import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const stats = await prisma.eventQuarterlyStats.findMany({
            orderBy: [
                { year: 'desc' },
                { quarter: 'desc' },
                { eventName: 'asc' }
            ]
        });
        
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

router.get('/latest-date', async (_req: Request, res: Response) => {
    try {
        const latestDate = await prisma.event.findFirst({
            orderBy: 
                { eventDate: 'desc' },
                select: {
                    eventDate: true
                }
        });
        
        res.json(latestDate);
    } catch (error) {
        console.error('Error fetching event dates:', error);
        res.status(500).json({ error: 'Failed to fetch event data' });
    }
});

export default router;