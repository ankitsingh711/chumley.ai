import { apiClient } from '../lib/apiClient';
import type { KPIMetrics, MonthlySpendData } from '../types/api';

export const reportsApi = {
    getKPIs: async (): Promise<KPIMetrics> => {
        const response = await apiClient.get<KPIMetrics>('/reports/kpi');
        return response.data;
    },

    getMonthlySpend: async (): Promise<MonthlySpendData[]> => {
        const response = await apiClient.get<MonthlySpendData[]>('/reports/spend');
        return response.data;
    },
};
