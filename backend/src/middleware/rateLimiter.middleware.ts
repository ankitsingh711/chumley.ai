import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import redisClient from '../config/redis';

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

// Webhook limiter: reduce abuse risk on public callback endpoints
const webhookLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'middleware_limiter_webhook',
    points: 120,
    duration: 60,
});

const getRequestIp = (req: Request): string => {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
        return forwardedFor.split(',')[0].trim();
    }
    return req.ip || 'unknown-ip';
};

export const rateLimiterMiddleware = (type: 'general' | 'auth' | 'webhook' = 'general') => {
    const limiter = type === 'auth'
        ? authLimiter
        : type === 'webhook'
            ? webhookLimiter
            : generalLimiter;

    return (req: Request, res: Response, next: NextFunction) => {
        // Bypass for local development
        if (process.env.NODE_ENV === 'development') {
            return next();
        }
        const key = getRequestIp(req);

        limiter.consume(key)
            .then(() => {
                next();
            })
            .catch(() => {
                res.status(429).json({ error: 'Too Many Requests' });
            });
    };
};
