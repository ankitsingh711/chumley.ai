import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class ApiClient {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            baseURL: API_BASE_URL,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Request interceptor to add auth token
        this.client.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                const token = localStorage.getItem('authToken');
                if (token && config.headers) {
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    // Don't redirect if we're on the login/register endpoints
                    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                                          error.config?.url?.includes('/auth/register');
                    
                    if (!isAuthEndpoint) {
                        // Token expired or invalid
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('currentUser');
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
