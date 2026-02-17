import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '../config/redis';
import Logger from '../utils/logger';

// General limiter: 100 requests per 15 minutes by IP
const generalLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware_limiter_general',
    points: 100, // 100 requests
    duration: 15 * 60, // per 15 minutes by default
});

// Auth limiter: 50 requests per 15 minutes by IP for login/register/etc
const authLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware_limiter_auth',
    points: 50,
    duration: 15 * 60,
});

export const rateLimiterMiddleware = (type: 'general' | 'auth' = 'general') => {
    const limiter = type === 'auth' ? authLimiter : generalLimiter;

    return (req: Request, res: Response, next: NextFunction) => {
        // Use IP as key. Handle proxy if needed (req.ip or x-forwarded-for)
        const key = req.ip || '127.0.0.1';

        limiter.consume(key)
            .then(() => {
                next();
            })
            .catch(() => {
                res.status(429).json({ error: 'Too Many Requests' });
            });
    };
};
