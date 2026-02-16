import http from 'http';
import app from './app';
import Logger from './utils/logger';
import { initializeWebSocket } from './utils/websocket';
import prisma from './config/db';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize WebSocket
initializeWebSocket(server);

server.listen(PORT, () => {
    Logger.info(`Server is running on port ${PORT}`);
    Logger.info('✅ Database connection successful');
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
    Logger.info('SIGTERM signal received: closing HTTP server');

    // Disconnect from database
    await prisma.$disconnect();

    server.close(() => {
        Logger.info('HTTP server closed');
        process.exit(0);
    });
});
