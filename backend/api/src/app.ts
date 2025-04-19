import express from 'express';
import cors from 'cors';
import statsRouter from './routes/stats.js';
import healthRouter from './routes/health.js';
import latestDateRouter from './routes/latest_date.js';

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET'],
    credentials: true
}));

app.use('/health', healthRouter);
app.use('/api/stats', statsRouter);
app.use('/api/latest-date', latestDateRouter);

export default app;
