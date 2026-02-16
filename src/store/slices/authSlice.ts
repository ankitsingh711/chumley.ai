import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../../services/auth.service';
import type { User, LoginRequest, RegisterRequest } from '../../types/api';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

// Initial state
const initialState: AuthState = {
    user: null,
    token: null,
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
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
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
            localStorage.setItem('authToken', response.token);
            localStorage.setItem('currentUser', JSON.stringify(response.user));
            return response;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Registration failed');
        }
    }
);

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authExpiration');
        return null;
    }
);

export const checkAuth = createAsyncThunk(
    'auth/checkAuth',
    async (_, { dispatch }) => {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('currentUser');
        const authExpiration = localStorage.getItem('authExpiration');

        if (storedToken && storedUser) {
            if (authExpiration) {
                const expirationDate = new Date(authExpiration);
                const now = new Date();

                if (now > expirationDate) {
                    dispatch(logoutUser());
                    return null;
                }
            }

            try {
                const user = JSON.parse(storedUser);
                return { token: storedToken, user };
            } catch (error) {
                console.error('Error parsing stored user:', error);
                dispatch(logoutUser());
                return null;
            }
        }
        return null;
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
            state.token = action.payload.token;
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
            state.token = action.payload.token;
        });
        builder.addCase(registerUser.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });

        // Logout
        builder.addCase(logoutUser.fulfilled, (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.isLoading = false;
        });

        // Check Auth
        builder.addCase(checkAuth.fulfilled, (state, action) => {
            if (action.payload) {
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.isAuthenticated = true;
            } else {
                state.user = null;
                state.token = null;
                state.isAuthenticated = false;
            }
            state.isLoading = false;
        });
        builder.addCase(checkAuth.rejected, (state) => {
            state.isLoading = false;
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
        });
    },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
