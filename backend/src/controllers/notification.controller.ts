import { Request, Response } from 'express';
import notificationService from '../services/notification.service';
import Logger from '../utils/logger';

/**
 * Get all notifications for the logged-in user
 */
export const getUserNotifications = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const unreadOnly = req.query.unreadOnly === 'true';
        const notifications = await notificationService.getUserNotifications(userId, unreadOnly);

        res.json(notifications);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

/**
 * Get unread count for the logged-in user
 */
export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const count = await notificationService.getUnreadCount(userId);

        res.json({ count });
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
};

/**
 * Mark a notification as read
 */
export const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const notification = await notificationService.markAsRead(id, userId);

        res.json(notification);
    } catch (error: any) {
        Logger.error(error);
        if (error.message === 'Notification not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await notificationService.markAllAsRead(userId);

        res.json({ success: true });
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.id;
        const id = req.params.id as string;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await notificationService.deleteNotification(id, userId);

        res.json({ success: true });
    } catch (error: any) {
        Logger.error(error);
        if (error.message === 'Notification not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};
