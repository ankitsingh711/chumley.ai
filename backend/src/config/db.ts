import { PrismaClient } from '@prisma/client';
import Logger from '../utils/logger';

/**
 * Centralized Prisma Client Singleton
 * 
 * This ensures only ONE PrismaClient instance is created across the entire application,
 * preventing connection pool exhaustion and improving performance.
 */

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient({
        log: ['error', 'warn'],
    });
} else {
    // In development, use a global variable to preserve the instance across hot reloads
    if (!global.prisma) {
        global.prisma = new PrismaClient({
            log: ['query', 'error', 'warn'],
        });
    }
    prisma = global.prisma;
}

// Log successful connection
prisma.$connect()
    .then(() => Logger.info('✅ Prisma Client connected'))
    .catch((err) => Logger.error('❌ Prisma Client connection failed', err));

// Graceful shutdown
const shutdown = async () => {
    await prisma.$disconnect();
    Logger.info('Prisma Client disconnected');
};

process.on('beforeExit', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default prisma;
