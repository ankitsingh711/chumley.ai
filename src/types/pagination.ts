export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// Helper to check if response is paginated
export function isPaginatedResponse<T>(response: any): response is PaginatedResponse<T> {
    return response && typeof response === 'object' && 'data' in response && 'meta' in response;
}
