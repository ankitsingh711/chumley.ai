import { apiClient } from '../lib/apiClient';
import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/api';

export const authApi = {
    login: async (data: LoginRequest): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/login', data);
        if (response.data.token) {
            localStorage.setItem('authToken', response.data.token);
        }
        return response.data;
    },

    register: async (data: RegisterRequest): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/register', data);
        if (response.data.token) {
            localStorage.setItem('authToken', response.data.token);
        }
        return response.data;
    },

    acceptInvite: async (data: { token: string; name: string; password: string; jobTitle?: string }): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/accept-invite', data);
        if (response.data.token) {
            localStorage.setItem('authToken', response.data.token);
        }
        return response.data;
    },

    getCurrentUser: async (): Promise<AuthResponse> => {
        const response = await apiClient.get<AuthResponse>('/auth/me');
        return response.data;
    },

    logout: async (): Promise<void> => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        }
    },
};
