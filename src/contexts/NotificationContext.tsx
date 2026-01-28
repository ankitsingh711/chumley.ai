import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { requestsApi } from '../services/requests.service';

const SPENDING_THRESHOLD = 1000;

export interface Notification {
    id: string;
    type: 'request_created' | 'request_approved' | 'request_rejected' | 'order_created' | 'spending_threshold';
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
    const [hasCheckedThreshold, setHasCheckedThreshold] = useState(false);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setHasCheckedThreshold(false);
            return;
        }

        const checkSpendingThreshold = async () => {
            try {
                const requests = await requestsApi.getAll();

                // Filter requests created by current user with APPROVED or PENDING status
                const userRequests = requests.filter(
                    req => req.requesterId === user.id &&
                        (req.status === 'APPROVED' || req.status === 'PENDING')
                );

                // Calculate total spending
                const totalSpending = userRequests.reduce(
                    (sum, req) => sum + Number(req.totalAmount),
                    0
                );

                // Check if threshold is reached and notification hasn't been created
                if (totalSpending >= SPENDING_THRESHOLD && !hasCheckedThreshold) {
                    const thresholdNotification: Notification = {
                        id: `threshold-${Date.now()}`,
                        type: 'spending_threshold',
                        title: 'Spending Threshold Reached',
                        message: `Your total spending has reached $${totalSpending.toLocaleString()}, exceeding the $${SPENDING_THRESHOLD.toLocaleString()} threshold.`,
                        userId: user.id,
                        createdAt: new Date(),
                        read: false,
                        metadata: { totalSpending, threshold: SPENDING_THRESHOLD },
                    };

                    setNotifications((prev) => [thresholdNotification, ...prev]);
                    setHasCheckedThreshold(true);
                } else if (totalSpending < SPENDING_THRESHOLD) {
                    // Reset if spending goes below threshold
                    setHasCheckedThreshold(false);
                    // Remove any existing threshold notifications
                    setNotifications((prev) =>
                        prev.filter(n => n.type !== 'spending_threshold')
                    );
                }
            } catch (error) {
                console.error('Failed to check spending threshold:', error);
            }
        };

        // Check threshold on mount and periodically
        checkSpendingThreshold();
        const interval = setInterval(checkSpendingThreshold, 30000); // Check every 30 seconds

        return () => {
            clearInterval(interval);
        };
    }, [user, hasCheckedThreshold]);

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
