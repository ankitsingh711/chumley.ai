import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis';
import Logger from '../utils/logger';

// Extend Express Response to include sendResponse property for typing if needed, 
// but here we just intercept the methods.

export const cacheMiddleware = (duration: number) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl || req.url}`;

        try {
            const cachedResponse = await redisClient.get(key);

            if (cachedResponse) {
                // Logger.info(`Cache hit for ${key}`);
                return res.json(JSON.parse(cachedResponse));
            }

            // Logger.info(`Cache miss for ${key}`);

            // Override res.json to cache the response
            const originalJson = res.json;

            res.json = (body: any): Response => {
                // Restore original method
                res.json = originalJson;

                // Cache the response asynchronously
                redisClient.set(key, JSON.stringify(body), 'EX', duration).catch((err) => {
                    Logger.error('Redis cache set error', err);
                });

                // Send the response
                return res.json(body);
            };

            next();
        } catch (error) {
            Logger.error('Redis cache middleware error', error);
            next();
        }
    };
};
