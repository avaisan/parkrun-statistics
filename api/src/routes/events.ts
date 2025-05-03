import { Router, Request, Response } from 'express';
import { readEventStats } from '../services/data.js';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    try {
        const stats = await readEventStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

export default router;