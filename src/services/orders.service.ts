import { apiClient } from '../lib/apiClient';
import type {
    PurchaseOrder,
    CreateOrderInput,
    UpdateOrderStatusInput,
} from '../types/api';

export const ordersApi = {
    getAll: async (): Promise<PurchaseOrder[]> => {
        const response = await apiClient.get<PurchaseOrder[]>('/orders');
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
