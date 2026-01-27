import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import Logger from './logger';

let io: SocketIOServer | null = null;

export const initializeWebSocket = (server: HTTPServer) => {
    io = new SocketIOServer(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:5173',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    io.on('connection', (socket) => {
        Logger.info(`Client connected: ${socket.id}`);

        socket.on('disconnect', () => {
            Logger.info(`Client disconnected: ${socket.id}`);
        });

        socket.on('join', (userId: string) => {
            socket.join(`user:${userId}`);
            Logger.info(`User ${userId} joined room`);
        });
    });

    return io;
};

export const getIO = (): SocketIOServer => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};

export interface NotificationPayload {
    id: string;
    type: 'request_created' | 'request_approved' | 'request_rejected' | 'order_created';
    title: string;
    message: string;
    userId: string;
    createdAt: Date;
    read: boolean;
    metadata?: Record<string, any>;
}

export const sendNotification = (userId: string, notification: NotificationPayload) => {
    if (!io) {
        Logger.warn('Socket.io not initialized, cannot send notification');
        return;
    }

    io.to(`user:${userId}`).emit('notification', notification);
    Logger.info(`Notification sent to user ${userId}: ${notification.type}`);
};
