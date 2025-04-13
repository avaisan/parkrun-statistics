import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export const handler = async (event) => {
    try {
        const stats = await prisma.eventQuarterlyStats.findMany({
            orderBy: [
                { year: 'desc' },
                { quarter: 'desc' },
                { eventName: 'asc' }
            ]
        });
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(stats)
        };
    }
    catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch statistics' })
        };
    }
};
