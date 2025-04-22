// api/src/index.ts
import { APIGatewayProxyHandler } from 'aws-lambda';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const handler: APIGatewayProxyHandler = async () => {
  try {
    // Your existing handler code
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
  } catch (error: unknown) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch statistics: ' + error }),
    };
  }
};
