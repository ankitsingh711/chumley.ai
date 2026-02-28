import { apiClient } from '../lib/apiClient';

export interface ChatResponse {
    text: string;
    data?: any;
    type?: 'text' | 'requests_list' | 'contracts_list' | 'spend_summary' | 'request_detail' | 'orders_list' | 'suppliers_list' | 'overview';
}

export const chatApi = {
    sendMessage: async (
        text: string,
        attachmentUrl?: string,
        contextAttachmentUrl?: string,
        history?: Array<{ sender: 'user' | 'bot'; text: string; type?: string }>
    ): Promise<ChatResponse> => {
        const response = await apiClient.post<ChatResponse>('/chat/message', {
            text,
            attachmentUrl,
            contextAttachmentUrl,
            history
        });
        return response.data;
    }
};
