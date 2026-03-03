import { apiClient } from '../lib/apiClient';
import { CANONICAL_DEPARTMENTS, normalizeDepartmentName } from '../utils/departments';

export interface Department {
    id: string;
    name: string;
    description: string | null;
    budget: number;
    createdAt: string;
    updatedAt: string;
    metrics?: {
        totalSpent?: number;
        requestCount?: number;
        pendingCount?: number;
        userCount?: number;
        [key: string]: number | undefined;
    };
}

const DEPARTMENT_ORDER = new Map<string, number>(
    CANONICAL_DEPARTMENTS.map((name, index) => [name, index]),
);

const MONTHLY_DEPARTMENT_BUDGETS: Record<string, number> = {
    Tech: 135000,
    Marketing: 350000,
    Support: 300000,
    Finance: 40000,
    'HR&Recruitments': 10000,
    'Sector Group': 100000,
    'Trade Group': 100000,
    'Fleet&Assets': 200000,
};

const resolveMonthlyBudget = (departmentName: string, currentBudget: number) => {
    const defaultBudget = MONTHLY_DEPARTMENT_BUDGETS[departmentName] || 0;
    return currentBudget > 0 ? currentBudget : defaultBudget;
};

const getDepartmentPriorityScore = (department: Department) => {
    const budgetScore = Number(department.budget || 0) > 0 ? 10_000 : 0;
    const requestScore = Number(department.metrics?.requestCount || 0) * 100;
    const userScore = Number(department.metrics?.userCount || 0) * 10;
    const spendScore = Number(department.metrics?.totalSpent || 0) > 0 ? 1 : 0;

    return budgetScore + requestScore + userScore + spendScore;
};

const dedupeDepartments = (departments: Department[]): Department[] => {
    const byName = new Map<string, Department>();

    departments.forEach((department) => {
        const normalizedName = normalizeDepartmentName(department.name) || department.name;
        if (!DEPARTMENT_ORDER.has(normalizedName)) {
            return;
        }

        const key = normalizedName.toLowerCase();
        const existing = byName.get(key);
        const normalizedBudget = resolveMonthlyBudget(normalizedName, Number(department.budget || 0));

        if (!existing) {
            byName.set(key, { ...department, name: normalizedName, budget: normalizedBudget });
            return;
        }

        const existingScore = getDepartmentPriorityScore(existing);
        const candidateScore = getDepartmentPriorityScore(department);
        const preferred = candidateScore > existingScore ? department : existing;
        const secondary = preferred === department ? existing : department;

        byName.set(key, {
            ...preferred,
            name: normalizedName,
            description: preferred.description ?? secondary.description ?? null,
            budget: resolveMonthlyBudget(
                normalizedName,
                Math.max(Number(existing.budget || 0), normalizedBudget),
            ),
            metrics: {
                ...(preferred.metrics || {}),
                totalSpent: Number(existing.metrics?.totalSpent || 0) + Number(department.metrics?.totalSpent || 0),
                requestCount: Number(existing.metrics?.requestCount || 0) + Number(department.metrics?.requestCount || 0),
                pendingCount: Number(existing.metrics?.pendingCount || 0) + Number(department.metrics?.pendingCount || 0),
                userCount: Number(existing.metrics?.userCount || 0) + Number(department.metrics?.userCount || 0),
            },
        });
    });

    return Array.from(byName.values()).sort((a, b) => {
        const rankA = DEPARTMENT_ORDER.get(a.name) ?? Number.MAX_SAFE_INTEGER;
        const rankB = DEPARTMENT_ORDER.get(b.name) ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
    }).map((department) => ({
        ...department,
        budget: resolveMonthlyBudget(department.name, Number(department.budget || 0)),
    }));
};

export const departmentsApi = {
    /**
     * Get all departments
     */
    async getAll(): Promise<Department[]> {
        const response = await apiClient.get('/departments');
        return dedupeDepartments(response.data);
    },

    /**
     * Get department by ID
     */
    async getById(id: string): Promise<Department> {
        const response = await apiClient.get(`/departments/${id}`);
        return response.data;
    },

    /**
     * Get department spending
     */
    async getSpending(id: string, startDate?: string, endDate?: string) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await apiClient.get(`/departments/${id}/spending?${params.toString()}`);
        return response.data;
    },

    /**
     * Get spending by category
     */
    async getSpendingByCategory(id: string) {
        const response = await apiClient.get(`/departments/${id}/spending/categories`);
        return response.data;
    },

    /**
     * Update department details
     */
    async update(id: string, data: Partial<Department>): Promise<Department> {
        const response = await apiClient.patch(`/departments/${id}`, data);
        return response.data;
    }
};
