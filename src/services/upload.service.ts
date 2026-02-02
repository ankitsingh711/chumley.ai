import { apiClient } from '../lib/apiClient';

interface UploadResponse {
    url: string;
    filename: string;
}

export const uploadApi = {
    uploadImage: async (file: File): Promise<string> => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await apiClient.post<UploadResponse>('/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data.url;
    },
};
