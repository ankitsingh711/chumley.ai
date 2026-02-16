import Redis from 'ioredis';
import Logger from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
});

redisClient.on('connect', () => {
    Logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
    Logger.error('Redis client error', err);
});

export default redisClient;
