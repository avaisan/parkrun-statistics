import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (_req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            services: {
                api: 'up',
                database: 'up'
            }
        };
        
        res.json(health);
    } catch (error) {
        console.error('Health check failed:', error);
        
        const health = {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            services: {
                api: 'up',
                database: 'down'
            },
            error: 'Database connection failed'
        };
        
        res.status(503).json(health);
    }
});

export default router;
