import logger from '../utils/logger.util.js';
import { PrismaService } from '../config/prisma.js';

const prisma = PrismaService.getInstance().client;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const connectDB = async (): Promise<void> => {
  const maxRetries = Number(process.env.POSTGRES_MAX_RETRIES || 5);
  const retryDelayMs = Number(process.env.POSTGRES_RETRY_DELAY_MS || 3000);

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      logger.info('PostgreSQL connected');
      return;
    } catch (error: any) {
      logger.error('PostgreSQL connection failed', {
        attempt,
        maxRetries,
        message: error?.message
      });

      if (attempt === maxRetries) {
        throw error;
      }

      await wait(retryDelayMs);
    }
  }
};
