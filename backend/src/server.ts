import http from 'http';
import app from './app';
import Logger from './utils/logger';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

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
