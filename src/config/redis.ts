import { Redis } from 'ioredis';
import logger from '../utils/logger.util.js';

let redisClient: Redis | null = null;

/**
 * Khởi tạo kết nối tới Redis Server
 */
export const connectRedis = async (url: string): Promise<Redis> => {
  if (!url) {
    throw new Error('REDIS_URL is required');
  }

  // Nếu đã khởi tạo trước đó và trạng thái khỏe mạnh, trả về luôn (Singleton Pattern)
  if (redisClient && ['ready', 'connecting', 'reconnecting'].includes(redisClient.status)) {
    return redisClient;
  }

  redisClient = new Redis(url, {
    maxRetriesPerRequest: null,
    retryStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis connection retry limit reached. Giving up.');
        return null; // Trả về null để dừng thử lại
      }
      const delay = Math.min(retries * 200, 3000);
      logger.warn('Redis reconnecting...', { retries, delay });
      return delay;
    }
  });

  // Đăng ký các sự kiện lắng nghe trạng thái (Event Listeners) liên tục toàn cục
  redisClient.on('connect', () => logger.info('Redis server connection established'));
  redisClient.on('ready', () => logger.info('Redis client is ready to use'));
  redisClient.on('error', (error) => logger.error('Redis global error', { message: error.message }));
  redisClient.on('close', () => logger.warn('Redis connection closed'));

  // Đợi cho đến khi client sẵn sàng (Xử lý không làm sập server nếu lỗi lúc khởi động)
  await new Promise<void>((resolve) => {
    if (redisClient?.status === 'ready') {
      return resolve();
    }
    // Chỉ đợi sự kiện ready. Nếu lỗi, ioredis sẽ tự trigger 'retryStrategy' ở trên ngầm, không reject làm sập App.
    redisClient?.once('ready', resolve);
  });

  return redisClient;
};

/**
 * Lấy Instance Redis hiện tại
 */
export const getRedisClient = (): Redis | null => redisClient;