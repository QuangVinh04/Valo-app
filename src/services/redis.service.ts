import { getRedisClient } from '../config/redis.js';

export class RedisService {

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const redis = getRedisClient();
    const serializedValue = JSON.stringify(value);

    if (ttlSeconds) {
      await redis.set(key, serializedValue, 'EX', ttlSeconds);
      return;
    }

    await redis.set(key, serializedValue);
  }

  async get<T>(key: string): Promise<T | null>{
    const redis = getRedisClient();
    const value = await redis.get(key);
    if(!value){
      return null;
    }
    return JSON.parse(value) as T;
  }

  async delete(key: string): Promise<void> {
    const redis = getRedisClient();
    await redis.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const redis = getRedisClient();
    const result = await redis.exists(key);

    return result === 1;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const redis = getRedisClient();
    await redis.expire(key, ttlSeconds);
  }

  async acquireLock(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const redis = getRedisClient();
    const result = await redis.set(key, value, 'EX', ttlSeconds, 'NX');

    return result === 'OK';
  }

}

export const redisService = new RedisService();
