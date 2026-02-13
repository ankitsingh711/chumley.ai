import { apiClient } from '../lib/apiClient';
import type { Category, CategoryTree } from '../types/category';

export const categoryService = {
    /**
     * Get entire category tree
     */
    async getCategoryTree(departmentId?: string): Promise<CategoryTree> {
        const params = departmentId ? { departmentId } : {};
        const response = await apiClient.get<CategoryTree>('/categories/tree', { params });
        return response.data;
    },

    /**
     * Get all categories with pagination
     */
    async getAllCategories(params?: {
        departmentId?: string;
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{ data: Category[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
        const response = await apiClient.get<{ data: Category[]; meta: { total: number; page: number; limit: number; totalPages: number } }>('/categories', { params });
        return response.data;
    },

    /**
     * Get categories by branch and department (for hierarchy)
     */
    async getCategoriesByBranchAndDepartment(branch: string, departmentId: string): Promise<Category[]> {
        const response = await apiClient.get<Category[]>('/categories/hierarchy', {
            params: { branch, departmentId }
        });
        return response.data;
    },

    /**
     * Get all categories by department (flat list)
     */
    async getCategoriesByDepartment(departmentId: string): Promise<Category[]> {
        const response = await apiClient.get<Category[]>(`/categories/department/${departmentId}`);
        return response.data;
    },

    /**
     * Get category hierarchy path
     */
    async getCategoryPath(id: string): Promise<Category[]> {
        const response = await apiClient.get<Category[]>(`/categories/${id}/path`);
        return response.data;
    },

    /**
     * Create a new category
     */
    async createCategory(data: {
        name: string;
        description?: string;
        parentId?: string;
        departmentId: string;
    }): Promise<Category> {
        const response = await apiClient.post<Category>('/categories', data);
        return response.data;
    },

    /**
     * Update a category
     */
    async updateCategory(
        id: string,
        data: {
            name?: string;
            description?: string;
            parentId?: string;
        }
    ): Promise<Category> {
        const response = await apiClient.put<Category>(`/categories/${id}`, data);
        return response.data;
    },

    /**
     * Delete a category
     */
    async deleteCategory(id: string): Promise<void> {
        await apiClient.delete(`/categories/${id}`);
    }
};
