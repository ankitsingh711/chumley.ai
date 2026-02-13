import { apiClient } from '../lib/apiClient';
import type {
    Supplier,
    CreateSupplierInput,
    UpdateSupplierInput,
    UpdateSupplierDetailsInput,
    Message,
    CreateMessageInput,
    InteractionLog,
    CreateInteractionInput,
    AddDocumentInput,
    SupplierDocument,
    Review,
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

    getDetails: async (id: string): Promise<Supplier> => {
        const response = await apiClient.get<Supplier>(`/suppliers/${id}/details`);
        return response.data;
    },

    updateDetails: async (id: string, data: UpdateSupplierDetailsInput): Promise<Supplier> => {
        const response = await apiClient.put<Supplier>(`/suppliers/${id}/details`, data);
        return response.data;
    },

    getMessages: async (id: string): Promise<Message[]> => {
        const response = await apiClient.get<Message[]>(`/suppliers/${id}/messages`);
        return response.data;
    },

    sendMessage: async (id: string, data: CreateMessageInput): Promise<Message> => {
        const response = await apiClient.post<Message>(`/suppliers/${id}/messages`, data);
        return response.data;
    },

    getInteractions: async (id: string): Promise<InteractionLog[]> => {
        const response = await apiClient.get<InteractionLog[]>(`/suppliers/${id}/interactions`);
        return response.data;
    },

    createInteraction: async (id: string, data: CreateInteractionInput): Promise<InteractionLog> => {
        const response = await apiClient.post<InteractionLog>(`/suppliers/${id}/interactions`, data);
        return response.data;
    },

    addDocument: async (id: string, data: AddDocumentInput): Promise<SupplierDocument> => {
        const response = await apiClient.post<SupplierDocument>(`/suppliers/${id}/documents`, data);
        return response.data;
    },

    getReviews: async (id: string, page = 1, limit = 5): Promise<{ data: Review[]; meta: any }> => {
        const response = await apiClient.get<{ data: Review[]; meta: any }>(`/suppliers/${id}/reviews?page=${page}&limit=${limit}`);
        return response.data;
    },

    addReview: async (id: string, data: { rating: number; comment: string }): Promise<Review> => {
        const response = await apiClient.post<Review>(`/suppliers/${id}/reviews`, data);
        return response.data;
    },

    approve: async (id: string): Promise<Supplier> => {
        const response = await apiClient.post<Supplier>(`/suppliers/${id}/approve`, {});
        return response.data;
    },

    reject: async (id: string): Promise<Supplier> => {
        const response = await apiClient.post<Supplier>(`/suppliers/${id}/reject`, {});
        return response.data;
    },
};
