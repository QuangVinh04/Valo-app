import { Redis } from 'ioredis';
import logger from '../utils/logger.util.js';

let redisClient: Redis | null = null;

const REDIS_CONNECT_TIMEOUT_MS = 10000;

export const connectRedis = async (url: string): Promise<Redis> => {
  if (!url) {
    throw new Error('REDIS_URL is required');
  }

  if (redisClient && ['ready', 'connecting', 'reconnecting'].includes(redisClient.status)) {
    return redisClient;
  }

  redisClient = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    retryStrategy: (retries) => {
      const delay = Math.min(retries * 200, 3000);
      logger.warn('Redis reconnecting...', { retries, delay });
      return delay;
    }
  });

  redisClient.on('connect', () => {
    logger.info('Redis server connection established');
  });

  redisClient.on('ready', () => {
    logger.info('Redis client is ready');
  });

  redisClient.on('error', (error) => {
    logger.error('Redis error', { message: error.message });
  });

  redisClient.on('close', () => {
    logger.warn('Redis connection closed');
  });

  await waitUntilRedisReady(redisClient);

  return redisClient;
};

const waitUntilRedisReady = async (client: Redis): Promise<void> => {
  if (client.status === 'ready') {
    return;
  }

  await Promise.race([
    new Promise<void>((resolve) => {
      client.once('ready', resolve);
    }),
    new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, REDIS_CONNECT_TIMEOUT_MS);
    })
  ]);
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis has not been initialized');
  }

  return redisClient;
};

