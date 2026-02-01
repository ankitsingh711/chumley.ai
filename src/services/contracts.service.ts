import { apiClient } from '../lib/apiClient';
import type { Contract, ContractStatus } from '../types/api';

export const contractsApi = {
    getAll: async (filters?: { status?: ContractStatus; supplierId?: string; expiringSoon?: boolean }) => {
        const response = await apiClient.get<Contract[]>('/contracts', {
            params: filters,
        });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await apiClient.get<Contract>(`/contracts/${id}`);
        return response.data;
    },

    create: async (data: Partial<Contract>) => {
        const response = await apiClient.post<Contract>('/contracts', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Contract>) => {
        const response = await apiClient.put<Contract>(`/contracts/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        await apiClient.delete(`/contracts/${id}`);
    },
};
