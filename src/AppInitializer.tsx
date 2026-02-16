import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { checkAuth } from './store/slices/authSlice';
import { fetchNotifications } from './store/slices/notificationSlice';

export const AppInitializer: React.FC = () => {
    const dispatch = useAppDispatch();
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);

    // Check auth on mount
    useEffect(() => {
        dispatch(checkAuth());
    }, [dispatch]);

    // Poll notifications
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        // Initial load
        dispatch(fetchNotifications());

        // Poll every 30 seconds
        const interval = setInterval(() => {
            dispatch(fetchNotifications());
        }, 30000);

        return () => clearInterval(interval);
    }, [dispatch, isAuthenticated, user]);

    return null;
};
