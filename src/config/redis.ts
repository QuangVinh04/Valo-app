import { createClient } from 'redis';
import logger from '../utils/logger.util.js';

let redisClient;

export const connectRedis = async (url) => {
  if (!url) {
    throw new Error('REDIS_URL is required');
  }

  redisClient = createClient({
    url,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnect limit reached');
          return new Error('Redis reconnect limit reached');
        }

        const delay = Math.min(retries * 200, 3000);
        logger.warn('Redis reconnecting', { retries, delay });
        return delay;
      }
    }
  });

  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('error', (error) => logger.error('Redis error', { message: error.message }));

  await redisClient.connect();
  return redisClient;
};

export const getRedisClient = () => redisClient;
