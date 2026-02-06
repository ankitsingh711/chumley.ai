import { apiClient } from '../lib/apiClient';

export interface ChatResponse {
    text: string;
    data?: any;
    type?: 'text' | 'requests_list' | 'contracts_list' | 'spend_summary';
}

export const chatApi = {
    sendMessage: async (text: string): Promise<ChatResponse> => {
        const response = await apiClient.post<ChatResponse>('/chat/message', { text });
        return response.data;
    }
};
