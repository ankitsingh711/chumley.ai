import Redis from 'ioredis';
import Logger from '../utils/logger';

const redisUrl = process.env.REDIS_URL;

// Export flag indicating if Redis is available
export const isRedisAvailable = !!redisUrl;

let redisClient: Redis | null = null;

if (redisUrl) {
    redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy(times) {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
        lazyConnect: true, // Don't connect immediately
    });

    redisClient.on('connect', () => {
        Logger.info('✅ Redis client connected');
    });

    redisClient.on('error', (err) => {
        Logger.error('Redis client error', err);
    });

    // Attempt to connect
    redisClient.connect().catch((err) => {
        Logger.warn('Failed to connect to Redis, caching will be disabled', err);
    });
} else {
    Logger.warn('REDIS_URL not configured - caching disabled');
}

export default redisClient;
