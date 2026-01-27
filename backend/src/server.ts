import http from 'http';
import app from './app';
import Logger from './utils/logger';
import { initializeWebSocket } from './utils/websocket';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Initialize WebSocket
initializeWebSocket(server);

server.listen(PORT, () => {
    Logger.info(`Server is running on port ${PORT}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    Logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        Logger.info('HTTP server closed');
    });
});
