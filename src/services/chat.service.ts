import { apiClient } from '../lib/apiClient';

export const chatApi = {
    sendMessage: async (message: string): Promise<string> => {
        const response = await apiClient.post<{ text: string }>('/chat', { message });
        return response.data.text;
    }
};
