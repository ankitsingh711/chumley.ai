import { apiClient } from '../lib/apiClient';
import type {
    PurchaseRequest,
    CreateRequestInput,
    UpdateRequestStatusInput,
} from '../types/api';

export const requestsApi = {
    getAll: async (): Promise<PurchaseRequest[]> => {
        const response = await apiClient.get<PurchaseRequest[]>('/requests');
        return response.data;
    },

    getById: async (id: string): Promise<PurchaseRequest> => {
        const response = await apiClient.get<PurchaseRequest>(`/requests/${id}`);
        return response.data;
    },

    create: async (data: CreateRequestInput): Promise<PurchaseRequest> => {
        const response = await apiClient.post<PurchaseRequest>('/requests', data);
        return response.data;
    },

    updateStatus: async (
        id: string,
        data: UpdateRequestStatusInput
    ): Promise<PurchaseRequest> => {
        const response = await apiClient.patch<PurchaseRequest>(
            `/requests/${id}/status`,
            data
        );
        return response.data;
    },
};
