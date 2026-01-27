import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface Notification {
    id: string;
    type: 'request_created' | 'request_approved' | 'request_rejected' | 'order_created';
    title: string;
    message: string;
    userId: string;
    createdAt: Date;
    read: boolean;
    metadata?: Record<string, any>;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!user) return;

        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3003';
        const newSocket = io(socketUrl, {
            withCredentials: true,
        });

        newSocket.on('connect', () => {
            console.log('WebSocket connected');
            newSocket.emit('join', user.id);
        });

        newSocket.on('notification', (notification: Notification) => {
            console.log('Received notification:', notification);
            setNotifications((prev) => [notification, ...prev]);
        });

        newSocket.on('disconnect', () => {
            console.log('WebSocket disconnected');
        });

        return () => {
            newSocket.close();
        };
    }, [user]);

    const markAsRead = (id: string) => {
        setNotifications((prev) =>
            prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
        );
    };

    const markAllAsRead = () => {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
    };

    const clearNotification = (id: string) => {
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
    };

    const unreadCount = notifications.filter((n) => !n.read).length;

    return (
        <NotificationContext.Provider
            value={{
                notifications,
                unreadCount,
                markAsRead,
                markAllAsRead,
                clearNotification,
            }}
        >
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within NotificationProvider');
    }
    return context;
};
