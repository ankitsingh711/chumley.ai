import { Router, Request, Response } from 'express';
import redisClient, { isRedisAvailable } from '../config/redis';
import prisma from '../config/db';
import Logger from '../utils/logger';

const router = Router();

/**
 * Health check endpoint
 * Returns the health status of the server and its dependencies
 */
router.get('/', async (req: Request, res: Response) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database: 'unknown',
            redis: 'unknown'
        }
    };

    try {
        // Check database connection
        await prisma.$queryRaw`SELECT 1`;
        health.services.database = 'connected';
    } catch (error) {
        health.services.database = 'disconnected';
        health.status = 'degraded';
        Logger.error('Database health check failed', error);
    }

    // Check Redis connection
    if (isRedisAvailable && redisClient) {
        try {
            await redisClient.ping();
            health.services.redis = 'connected';
        } catch (error) {
            health.services.redis = 'disconnected';
            // Redis is optional, so don't mark as degraded
            Logger.warn('Redis health check failed', error);
        }
    } else {
        health.services.redis = 'not_configured';
    }

    // Return appropriate status code
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

export default router;
