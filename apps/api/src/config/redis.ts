import Redis from 'ioredis';
import { env } from './env';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) {
          console.warn('⚠️ Redis connection attempts exceeded. Continuing in memory-fallback mode.');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      console.log('✅ Connected to Redis cache & pub/sub');
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      console.warn('⚠️ Redis connection notice:', err.message);
    });
  }

  return redisClient;
}

export function isRedisConnected(): boolean {
  return isRedisAvailable;
}
