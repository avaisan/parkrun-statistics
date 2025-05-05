import { Router, Request, Response } from 'express';
import { readLatestDate } from '../services/data.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const latestDate = await readLatestDate();
        res.json(latestDate);
    } catch (error) {
        console.error('Error fetching latest date:', error);
        res.status(500).json({ error: 'Failed to fetch latest date' });
    }
});

export default router;