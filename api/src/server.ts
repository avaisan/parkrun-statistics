import './env.js';
import app from './app.js';

const port = process.env.PORT ?? 3001;

app.listen(port, () => {
    console.info(`Server running at http://localhost:${port}`);
});
