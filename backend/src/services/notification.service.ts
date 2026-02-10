import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateNotificationInput {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, any>;
}

class NotificationService {
    /**
     * Create a new notification
     */
    async createNotification(input: CreateNotificationInput) {
        return await prisma.notification.create({
            data: {
                userId: input.userId,
                type: input.type,
                title: input.title,
                message: input.message,
                metadata: input.metadata || {},
            },
        });
    }

    /**
     * Get all notifications for a user
     */
    async getUserNotifications(userId: string, unreadOnly: boolean = false) {
        return await prisma.notification.findMany({
            where: {
                userId,
                ...(unreadOnly ? { read: false } : {}),
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: string, userId: string) {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return await prisma.notification.update({
            where: { id: notificationId },
            data: { read: true },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string) {
        return await prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
    }

    /**
     * Delete a notification
     */
    async deleteNotification(notificationId: string, userId: string) {
        const notification = await prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });

        if (!notification) {
            throw new Error('Notification not found');
        }

        return await prisma.notification.delete({
            where: { id: notificationId },
        });
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        return await prisma.notification.count({
            where: { userId, read: false },
        });
    }
}

export default new NotificationService();
