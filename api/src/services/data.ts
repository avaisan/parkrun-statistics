import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper to get data directory path
const getDataPath = () => {
    // In Docker, data is mounted at /app/data
    if (process.env.NODE_ENV === 'development') {
        return '/app/data';
    }
    // Local development
    return join(__dirname, '../../../data');
};

export async function readEventStats() {
    try {
        const dataDir = getDataPath();
        const filePath = join(dataDir, 'parkrun-data.json');
        const data = await readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading event stats:', error);
        throw new Error('Failed to read event statistics');
    }
}

export async function readLatestDate() {
    try {
        const dataDir = getDataPath();
        const filePath = join(dataDir, 'latest_date.json');
        const data = await readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading latest date:', error);
        throw new Error('Failed to read latest date');
    }
}