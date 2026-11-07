import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { FILES } from '../config.js';

const s3Client = new S3Client({});
const bucketName = process.env.DATA_BUCKET_NAME;
const statsFilePath = process.env.STATS_FILE_PATH ?? FILES.STATS;
const dateFilePath = process.env.DATE_FILE_PATH ?? FILES.LATEST_DATE;

/** Data folder mounted into the dev container (see docker-compose.yml). */
const DEFAULT_DATA_DIR = '/app/data';

/**
 * Resolves a data file path for development mode.
 * Uses DATA_DIR when set (relative paths resolve against the working directory),
 * otherwise falls back to the Docker mount path.
 */
function localDataPath(fileName: string): string {
    return resolve(process.env.DATA_DIR ?? DEFAULT_DATA_DIR, fileName);
}

async function readFromS3(key: string) {
    if (!bucketName) {
        throw new Error('DATA_BUCKET_NAME environment variable not set');
    }

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key
    });

    const response = await s3Client.send(command);
    const str = await response.Body?.transformToString();
    return JSON.parse(str || '{}');
}

export async function readEventStats() {
    try {
        if (process.env.NODE_ENV === 'development') {
            const data = await readFile(localDataPath(FILES.STATS), 'utf-8');
            const parsed = JSON.parse(data);
            return parsed.event_quarterly_stats || parsed;
        }
        
        const data = await readFromS3(statsFilePath);
        return data.event_quarterly_stats || data;
    } catch (error) {
        console.error('Error reading event stats:', error);
        throw new Error('Failed to read event statistics', { cause: error });
    }
}

export async function readLatestDate() {
    try {
        if (process.env.NODE_ENV === 'development') {
            const data = await readFile(localDataPath(FILES.LATEST_DATE), 'utf-8');
            return JSON.parse(data);
        }

        return await readFromS3(dateFilePath);
    } catch (error) {
        console.error('Error reading latest date:', error);
        throw new Error('Failed to read latest date', { cause: error });
    }
}