import axios, { type AxiosInstance } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003/api';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
            withCredentials: true, // Send cookies with requests
        });

        // Request interceptor to add token
        this.client.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('authToken');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    // Don't redirect if we're on the login/register endpoints or checking auth status
                    const isAuthEndpoint = error.config?.url?.includes('/auth/login') ||
                        error.config?.url?.includes('/auth/register') ||
                        error.config?.url?.includes('/auth/me');

                    if (!isAuthEndpoint) {
                        // Session expired or invalid
                        window.location.href = '/login';
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    getClient(): AxiosInstance {
        return this.client;
    }
}

export const apiClient = new ApiClient().getClient();
