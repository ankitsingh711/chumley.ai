import { apiClient } from '../lib/apiClient';
import type {
    Supplier,
    CreateSupplierInput,
    UpdateSupplierInput,
} from '../types/api';

export const suppliersApi = {
    getAll: async (): Promise<Supplier[]> => {
        const response = await apiClient.get<Supplier[]>('/suppliers');
        return response.data;
    },

    getById: async (id: string): Promise<Supplier> => {
        const response = await apiClient.get<Supplier>(`/suppliers/${id}`);
        return response.data;
    },

    create: async (data: CreateSupplierInput): Promise<Supplier> => {
        const response = await apiClient.post<Supplier>('/suppliers', data);
        return response.data;
    },

    update: async (id: string, data: UpdateSupplierInput): Promise<Supplier> => {
        const response = await apiClient.put<Supplier>(`/suppliers/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/suppliers/${id}`);
    },
};
