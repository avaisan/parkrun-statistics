import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
const router = Router();
const prisma = new PrismaClient();
router.get('/', async (_req, res) => {
    try {
        const stats = await prisma.eventQuarterlyStats.findMany({
            orderBy: [
                { year: 'desc' },
                { quarter: 'desc' },
                { eventName: 'asc' }
            ]
        });
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});
export default router;
