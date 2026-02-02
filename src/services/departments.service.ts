import { apiClient } from '../lib/apiClient';

export interface Department {
    id: string;
    name: string;
    description: string | null;
    budget: number;
    createdAt: string;
    updatedAt: string;
}

export const departmentsApi = {
    /**
     * Get all departments
     */
    async getAll(): Promise<Department[]> {
        const response = await apiClient.get('/departments');
        return response.data;
    },

    /**
     * Get department by ID
     */
    async getById(id: string): Promise<Department> {
        const response = await apiClient.get(`/departments/${id}`);
        return response.data;
    },

    /**
     * Get department spending
     */
    async getSpending(id: string, startDate?: string, endDate?: string) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await apiClient.get(`/departments/${id}/spending?${params.toString()}`);
        return response.data;
    },

    /**
     * Get spending by category
     */
    async getSpendingByCategory(id: string) {
        const response = await apiClient.get(`/departments/${id}/spending/categories`);
        return response.data;
    },

    /**
     * Update department details
     */
    async update(id: string, data: Partial<Department>): Promise<Department> {
        const response = await apiClient.patch(`/departments/${id}`, data);
        return response.data;
    }
};
