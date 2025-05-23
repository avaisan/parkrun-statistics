import { readFile } from 'fs/promises';
import { join } from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { FILES } from '../config.js';

const s3Client = new S3Client({});
const bucketName = process.env.DATA_BUCKET_NAME;
const statsFilePath = process.env.STATS_FILE_PATH ?? FILES.STATS;
const dateFilePath = process.env.DATE_FILE_PATH ?? FILES.LATEST_DATE;

async function readFromS3(key: string) {
    if (!bucketName) {
        throw new Error('DATA_BUCKET_NAME environment variable not set');
    }

    console.log(`Reading from S3 bucket: ${bucketName}, key: ${key}`);

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
            const dataDir = '/app/data';
            const filePath = join(dataDir, 'parkrun-data.json');
            const data = await readFile(filePath, 'utf-8');
            return JSON.parse(data);
        }
        
        return await readFromS3(statsFilePath);
    } catch (error) {
        console.error('Error reading event stats:', error);
        throw new Error('Failed to read event statistics');
    }
}

export async function readLatestDate() {
    try {
        if (process.env.NODE_ENV === 'development') {
            const dataDir = '/app/data';
            const filePath = join(dataDir, 'latest_date.json');
            const data = await readFile(filePath, 'utf-8');
            return JSON.parse(data);
        }

        return await readFromS3(dateFilePath);
    } catch (error) {
        console.error('Error reading latest date:', error);
        throw new Error('Failed to read latest date');
    }
}