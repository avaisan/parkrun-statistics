import express from 'express';
import cors from 'cors';
import statsRouter from './routes/stats.js';
import healthRouter from './routes/health.js';

const app = express();

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-domain.com'] 
        : ['http://localhost:5173', 'http://frontend:5173'],
    methods: ['GET'],
    credentials: true
}));

app.use('/health', healthRouter);
app.use('/stats', statsRouter);

export default app; 