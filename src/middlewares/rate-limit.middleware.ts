import type { NextFunction, Request, Response } from 'express';
import { RateLimiterRedis, type RateLimiterAbstract, type RateLimiterRes } from 'rate-limiter-flexible';
import { ErrorCode } from '../constants/error-code.js';
import type { AuthenticatedRequest } from './auth.middleware.js';
import AppError from '../utils/app-error.js';
import { getRedisClient } from '../config/redis.js';

interface RateLimitOptions {
  keyPrefix: string;
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

const getClientIp = (req: Request): string => {
  return req.ip || req.socket.remoteAddress || 'unknown';
};
const getAuthenticatedUserKey = (req: Request): string => {
  const userId = (req as Partial<AuthenticatedRequest>).user?.userId;
  return userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
};

export const createRateLimit = (options: RateLimitOptions) => {
  let rateLimiter: RateLimiterAbstract | null = null;

  const getRateLimiter = (): RateLimiterAbstract => {
    if (!rateLimiter) {
      const redisClient = getRedisClient();
      if (!redisClient) {
        throw new AppError(ErrorCode.INTERNAL_SERVER_ERROR, 'Redis store is required for rate limiting');
      }

      rateLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: options.keyPrefix,
        points: options.maxRequests,
        duration: Math.ceil(options.windowMs / 1000),
      });
    }

    return rateLimiter;
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const generateKey = options.keyGenerator ?? getClientIp;
    const key = generateKey(req);
    try {
      const rateLimiterRes = await getRateLimiter().consume(key);

      // Thiết lập các Header thành công chuẩn RFC
      res.setHeader('X-RateLimit-Limit', options.maxRequests);
      res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);

      next();
    } catch (rejected) {
      // Trường hợp lỗi do vượt ngưỡng giới hạn (RateLimiterRes)
      if (rejected && typeof rejected === 'object' && 'msBeforeNext' in rejected) {
        const errorRes = rejected as RateLimiterRes;
        const retryAfterSeconds = Math.ceil(errorRes.msBeforeNext / 1000);

        res.setHeader('Retry-After', retryAfterSeconds);
        res.setHeader('X-RateLimit-Limit', options.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);

        next(new AppError(ErrorCode.RATE_LIMIT_EXCEEDED, `Too many requests. Please try again after ${retryAfterSeconds}s.`));
        return;
      }

      // Các lỗi hệ thống khác (ví dụ: mất kết nối Redis đột ngột trong lúc runtime)
      next(rejected instanceof Error ? rejected : new AppError(ErrorCode.INTERNAL_SERVER_ERROR));
    }
  };
};

export const authRateLimit = createRateLimit({
  keyPrefix: 'auth',
  windowMs: 15 * 60 * 1000,
  maxRequests: 30
});

export const aiChatRateLimit = createRateLimit({
  keyPrefix: 'ai-chat',
  windowMs: 60 * 1000,
  maxRequests: 20,
  keyGenerator: getAuthenticatedUserKey
});
