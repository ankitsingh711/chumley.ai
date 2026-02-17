import { apiClient } from '../lib/apiClient';

export interface Notification {
    id: string;
    userId: string;
    type: 'BUDGET_WARNING' | 'BUDGET_CRITICAL' | 'BUDGET_EXCEEDED' | 'REQUEST_APPROVED' | 'REQUEST_REJECTED' | 'CONTRACT_EXPIRING' | 'SYSTEM_ALERT';
    title: string;
    message: string;
    metadata?: Record<string, any>;
    read: boolean;
    createdAt: string;
}

export const notificationsApi = {
    /**
     * Get all notifications for the current user
     */
    getAll: async (unreadOnly: boolean = false): Promise<Notification[]> => {
        const params = unreadOnly ? '?unreadOnly=true' : '';
        const response = await apiClient.get<Notification[]>(`/notifications${params}`);
        return response.data;
    },

    /**
     * Get unread count
     */
    getUnreadCount: async (): Promise<number> => {
        const response = await apiClient.get<{ count: number }>('/notifications/unread/count');
        return response.data.count;
    },

    /**
     * Mark a notification as read  
     */
    markAsRead: async (id: string): Promise<Notification> => {
        const response = await apiClient.put<Notification>(`/notifications/${id}/read`);
        return response.data;
    },

    /**
     * Mark all notifications as read
     */
    markAllAsRead: async (): Promise<void> => {
        await apiClient.put('/notifications/read-all');
    },

    /**
     * Delete a notification
     */
    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/notifications/${id}`);
    },
};
