import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const latestEvent = await prisma.event.findFirst({
            orderBy: 
                { eventDate: 'desc' },
                select: {
                    eventDate: true
                }
        });
        
        res.json(latestEvent?.eventDate ?? null);
    } catch (error) {
        console.error('Error fetching event dates:', error);
        res.status(500).json({ error: 'Failed to fetch event data' });
    }
});

export default router;