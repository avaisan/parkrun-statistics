import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
            api: 'up'
        }
    };
    
    res.json(health);
});

export default router;