import { apiClient } from '../lib/apiClient';
import type {
    PurchaseOrder,
    CreateOrderInput,
    UpdateOrderStatusInput,
} from '../types/api';
import type { PaginatedResponse } from '../types/pagination';

export const ordersApi = {
    getAll: async (page?: number, limit = 10): Promise<PurchaseOrder[] | PaginatedResponse<PurchaseOrder>> => {
        const url = page ? `/orders?page=${page}&limit=${limit}` : '/orders';
        const response = await apiClient.get<PurchaseOrder[] | PaginatedResponse<PurchaseOrder>>(url);
        return response.data;
    },

    getById: async (id: string): Promise<PurchaseOrder> => {
        const response = await apiClient.get<PurchaseOrder>(`/orders/${id}`);
        return response.data;
    },

    create: async (data: CreateOrderInput): Promise<PurchaseOrder> => {
        const response = await apiClient.post<PurchaseOrder>('/orders', data);
        return response.data;
    },

    updateStatus: async (
        id: string,
        data: UpdateOrderStatusInput
    ): Promise<PurchaseOrder> => {
        const response = await apiClient.patch<PurchaseOrder>(
            `/orders/${id}/status`,
            data
        );
        return response.data;
    },
};
