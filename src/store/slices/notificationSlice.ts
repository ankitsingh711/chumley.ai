import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationsApi, type Notification } from '../../services/notification.service';

interface NotificationState {
    items: Notification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
}

const initialState: NotificationState = {
    items: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
};

export const fetchNotifications = createAsyncThunk(
    'notifications/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await notificationsApi.getAll();
            return response;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch notifications');
        }
    }
);

export const markNotificationRead = createAsyncThunk(
    'notifications/markRead',
    async (id: string, { rejectWithValue }) => {
        try {
            await notificationsApi.markAsRead(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to mark notification as read');
        }
    }
);

export const markAllNotificationsRead = createAsyncThunk(
    'notifications/markAllRead',
    async (_, { rejectWithValue }) => {
        try {
            await notificationsApi.markAllAsRead();
            return;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to mark all notifications as read');
        }
    }
);

export const deleteNotification = createAsyncThunk(
    'notifications/delete',
    async (id: string, { rejectWithValue }) => {
        try {
            await notificationsApi.delete(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to delete notification');
        }
    }
);

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        // Fetch
        builder.addCase(fetchNotifications.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fetchNotifications.fulfilled, (state, action) => {
            state.isLoading = false;
            state.items = action.payload;
            state.unreadCount = action.payload.filter((n) => !n.read).length;
        });
        builder.addCase(fetchNotifications.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });

        // Mark Read
        builder.addCase(markNotificationRead.fulfilled, (state, action) => {
            const id = action.payload;
            const notification = state.items.find((n) => n.id === id);
            if (notification && !notification.read) {
                notification.read = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        });

        // Mark All Read
        builder.addCase(markAllNotificationsRead.fulfilled, (state) => {
            state.items.forEach((n) => {
                n.read = true;
            });
            state.unreadCount = 0;
        });

        // Delete
        builder.addCase(deleteNotification.fulfilled, (state, action) => {
            const id = action.payload;
            const notification = state.items.find((n) => n.id === id);
            if (notification && !notification.read) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
            state.items = state.items.filter((n) => n.id !== id);
        });
    },
});

export default notificationSlice.reducer;
