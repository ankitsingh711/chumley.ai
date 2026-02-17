import { apiClient } from '../lib/apiClient';
import type {
    PurchaseRequest,
    CreateRequestInput,
    UpdateRequestStatusInput,
    Attachment,
} from '../types/api';
import type { PaginatedResponse } from '../types/pagination';

export const requestsApi = {
    getAll: async (page?: number, limit = 20): Promise<PurchaseRequest[] | PaginatedResponse<PurchaseRequest>> => {
        const url = page ? `/requests?page=${page}&limit=${limit}` : '/requests';
        const response = await apiClient.get<PurchaseRequest[] | PaginatedResponse<PurchaseRequest>>(url);
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

    delete: async (id: string): Promise<void> => {
        await apiClient.delete(`/requests/${id}`);
    },

    addAttachment: async (requestId: string, attachment: { filename: string; fileUrl: string; fileSize: number; mimeType: string }) => {
        const response = await apiClient.post<Attachment>(`/requests/${requestId}/attachments`, attachment);
        return response.data;
    },
};
