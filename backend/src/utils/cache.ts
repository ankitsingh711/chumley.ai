import redisClient from '../config/redis';
import Logger from './logger';

export class CacheService {
    /**
     * Get cached value
     */
    static async get<T>(key: string): Promise<T | null> {
        try {
            if (!redisClient) {
                Logger.warn('Redis not available, cache get skipped');
                return null;
            }

            const cached = await redisClient.get(key);

            if (cached) {
                Logger.debug(`Cache HIT: ${key}`);
                return JSON.parse(cached) as T;
            }

            Logger.debug(`Cache MISS: ${key}`);
            return null;
        } catch (error) {
            Logger.error(`Cache get error for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Set cache value with TTL
     */
    static async set(key: string, value: any, ttlSeconds: number): Promise<void> {
        try {
            if (!redisClient) {
                Logger.warn('Redis not available, cache set skip skipped');
                return;
            }

            await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
            Logger.debug(`Cache SET: ${key} (TTL: ${ttlSeconds}s)`);
        } catch (error) {
            Logger.error(`Cache set error for key ${key}:`, error);
        }
    }

    /**
     * Delete cache key
     */
    static async del(key: string): Promise<void> {
        try {
            if (!redisClient) return;

            await redisClient.del(key);
            Logger.debug(`Cache DEL: ${key}`);
        } catch (error) {
            Logger.error(`Cache del error for key ${key}:`, error);
        }
    }

    /**
     * Delete all keys matching a pattern
     */
    static async delPattern(pattern: string): Promise<void> {
        try {
            if (!redisClient) return;

            const keys = await redisClient.keys(pattern);

            if (keys.length > 0) {
                await redisClient.del(...keys);
                Logger.debug(`Cache DEL pattern: ${pattern} (${keys.length} keys)`);
            }
        } catch (error) {
            Logger.error(`Cache del pattern error for ${pattern}:`, error);
        }
    }

    /**
     * Invalidate all supplier-related caches
     */
    static async invalidateSupplierCache(supplierId?: string): Promise<void> {
        if (supplierId) {
            await this.delPattern(`supplier:${supplierId}:*`);
        }
        await this.delPattern('suppliers:list:*');
    }

    /**
     * Invalidate all request-related caches
     */
    static async invalidateRequestCache(requestId?: string): Promise<void> {
        if (requestId) {
            await this.delPattern(`request:${requestId}:*`);
        }
        await this.delPattern('requests:list:*');
        await this.delPattern('kpis:*'); // KPIs depend on requests
    }

    /**
     * Invalidate all order-related caches
     */
    static async invalidateOrderCache(orderId?: string): Promise<void> {
        if (orderId) {
            await this.delPattern(`order:${orderId}:*`);
        }
        await this.delPattern('orders:list:*');
        await this.delPattern('kpis:*'); // KPIs depend on orders
        await this.delPattern('monthly-spend:*');
    }

    /**
     * Invalidate all contract-related caches
     */
    static async invalidateContractCache(contractId?: string): Promise<void> {
        if (contractId) {
            await this.delPattern(`contract:${contractId}:*`);
        }
        await this.delPattern('contracts:list:*');
    }

    /**
     * Invalidate all user-related caches
     */
    static async invalidateUserCache(userId?: string): Promise<void> {
        if (userId) {
            await this.delPattern(`user:${userId}:*`);
        }
        await this.delPattern('users:list:*');
    }
}
