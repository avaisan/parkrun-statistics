import express from 'express';
import cors from 'cors';
import eventsRouter from './routes/events.js';
import latestDateRouter from './routes/latest_date.js';
import healthRouter from './routes/health.js';

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL ?? '*',
    methods: ['GET']
}));
app.use(express.json());

app.use('/api/events', eventsRouter);
app.use('/api/latest-date', latestDateRouter);
app.use('/api/health', healthRouter);

export default app;