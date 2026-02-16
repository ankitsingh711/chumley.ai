import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
} from '../store/slices/notificationSlice';

export const useNotifications = () => {
    const dispatch = useAppDispatch();
    const { items: notifications, unreadCount, isLoading, error } = useAppSelector(
        (state) => state.notifications
    );

    const markAsRead = useCallback(
        (id: string) => {
            dispatch(markNotificationRead(id));
        },
        [dispatch]
    );

    const markAllAsRead = useCallback(() => {
        dispatch(markAllNotificationsRead());
    }, [dispatch]);

    const clearNotification = useCallback(
        (id: string) => {
            dispatch(deleteNotification(id));
        },
        [dispatch]
    );

    return {
        notifications,
        unreadCount,
        isLoading,
        error,
        markAsRead,
        markAllAsRead,
        clearNotification,
    };
};
