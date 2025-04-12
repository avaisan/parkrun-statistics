import express from 'express';
import cors from 'cors';
import statsRouter from './routes/stats.js';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET']
}));

app.use('/api/stats', statsRouter);

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});