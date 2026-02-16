import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../services/auth.service';
import type { User, LoginRequest, RegisterRequest } from '../../types/api';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// Initial state
const initialState: AuthState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
};

// Async Thunks
export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials: LoginRequest, { rejectWithValue }) => {
        try {
            const response = await authApi.login(credentials);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Login failed');
        }
    }
);

export const registerUser = createAsyncThunk(
    'auth/register',
    async (data: RegisterRequest, { rejectWithValue }) => {
        try {
            const response = await authApi.register(data);
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Registration failed');
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async () => {
        await authApi.logout();
        return null;
    }
);

export const checkAuth = createAsyncThunk(
    'auth/checkAuth',
    async (_, { rejectWithValue }) => {
        try {
            const response = await authApi.getCurrentUser();
            return response;
        } catch (error) {
            return rejectWithValue('Session expired or invalid');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Login
        builder.addCase(loginUser.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(loginUser.fulfilled, (state, action) => {
            state.isLoading = false;
            state.isAuthenticated = true;
            state.user = action.payload.user;
        });
        builder.addCase(loginUser.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });

        // Register
        builder.addCase(registerUser.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(registerUser.fulfilled, (state, action) => {
            state.isLoading = false;
            state.isAuthenticated = true;
            state.user = action.payload.user;
        });
        builder.addCase(registerUser.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });

        // Logout
        builder.addCase(logoutUser.fulfilled, (state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.isLoading = false;
        });

        // Check Auth
        builder.addCase(checkAuth.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(checkAuth.fulfilled, (state, action) => {
            state.user = action.payload.user;
            state.isAuthenticated = true;
            state.isLoading = false;
        });
        builder.addCase(checkAuth.rejected, (state) => {
            state.isLoading = false;
            state.user = null;
            state.isAuthenticated = false;
        });
    },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
