import { apiClient } from '../lib/apiClient';
import type { KPIMetrics, MonthlySpendData } from '../types/api';

export const reportsApi = {
    getKPIs: async (startDate?: string, endDate?: string): Promise<KPIMetrics> => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const query = params.toString();
        const response = await apiClient.get<KPIMetrics>(`/reports/kpi${query ? `?${query}` : ''}`);
        return response.data;
    },

    getMonthlySpend: async (startDate?: string, endDate?: string): Promise<MonthlySpendData[]> => {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const query = params.toString();
        const response = await apiClient.get<MonthlySpendData[]>(`/reports/spend${query ? `?${query}` : ''}`);
        return response.data;
    },
};
