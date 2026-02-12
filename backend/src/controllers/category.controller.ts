import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { hierarchyService } from '../services/hierarchy.service';
import { Branch } from '@prisma/client';

export const categoryController = {
    /**
     * GET /api/categories
     * Get all categories with optional department filter
     */
    async getAllCategories(req: Request, res: Response) {
        try {
            const { departmentId } = req.query;
            const categories = await categoryService.getAllCategories(
                typeof departmentId === 'string' ? departmentId : undefined
            );
            res.json(categories);
        } catch (error: any) {
            console.error('Error fetching categories:', error);
            res.status(500).json({ error: error.message || 'Failed to fetch categories' });
        }
    },

    /**
     * GET /api/categories/hierarchy
     * Get categories by branch and department
     */
    async getHierarchy(req: Request, res: Response) {
        try {
            const { branch, departmentId } = req.query;

            if (!branch || !departmentId) {
                return res.status(400).json({
                    error: 'Branch and departmentId are required'
                });
            }

            const branchEnum = branch.toString().toUpperCase() as Branch;
            const categories = await hierarchyService.getCategoriesByBranchAndDepartment(
                branchEnum,
                departmentId as string
            );
            res.json(categories);
        } catch (error: any) {
            console.error('Error fetching hierarchy:', error);
            res.status(500).json({ error: error.message || 'Failed to fetch hierarchy' });
        }
    },

    /**
     * GET /api/categories/tree
     * Get hierarchical tree structure
     */
    async getCategoryTree(req: Request, res: Response) {
        try {
            const { departmentId, branch } = req.query;

            if (branch && departmentId) {
                const branchEnum = branch.toString().toUpperCase() as Branch;
                const tree = await hierarchyService.getHierarchyTree(
                    branchEnum,
                    departmentId as string
                );
                return res.json(tree);
            }

            const tree = await categoryService.getCategoryTree(
                typeof departmentId === 'string' ? departmentId : undefined
            );
            res.json(tree);
        } catch (error: any) {
            console.error('Error fetching category tree:', error);
            res.status(500).json({ error: error.message || 'Failed to fetch category tree' });
        }
    },

    /**
     * GET /api/categories/department/:departmentId
     * Get all categories for a specific department
     */
    async getCategoriesByDepartment(req: Request, res: Response) {
        try {
            const { departmentId } = req.params;
            const categories = await categoryService.getCategoriesByDepartment(departmentId as string);
            res.json(categories);
        } catch (error: any) {
            console.error('Error fetching department categories:', error);
            res.status(500).json({ error: error.message || 'Failed to fetch department categories' });
        }
    },

    /**
     * GET /api/categories/:id
     * Get a specific category by ID
     */
    async getCategoryById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const category = await categoryService.getCategoryById(id as string);

            if (!category) {
                return res.status(404).json({ error: 'Category not found' });
            }

            res.json(category);
        } catch (error: any) {
            console.error('Error fetching category:', error);
            res.status(500).json({ error: error.message || 'Failed to fetch category' });
        }
    },

    /**
     * GET /api/categories/:id/path
     * Get the full path (breadcrumb) for a category
     */
    async getCategoryPath(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const path = await categoryService.getCategoryPath(id as string);
            res.json(path);
        } catch (error: any) {
            console.error('Error fetching category path:', error);
            res.status(500).json({ error: error.message || 'Failed to fetch category path' });
        }
    },

    /**
     * POST /api/categories
     * Create a new category
     */
    async createCategory(req: Request, res: Response) {
        try {
            const { name, description, parentId, departmentId, branch } = req.body;

            if (!name || !departmentId || !branch) {
                return res.status(400).json({
                    error: 'Name, departmentId, and branch are required'
                });
            }

            const category = await categoryService.createCategory({
                name,
                description,
                parentId,
                departmentId,
                branch: branch as Branch,
            });

            res.status(201).json(category);
        } catch (error: any) {
            console.error('Error creating category:', error);
            res.status(400).json({ error: error.message || 'Failed to create category' });
        }
    },

    /**
     * PUT /api/categories/:id
     * Update a category
     */
    async updateCategory(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name, description, parentId } = req.body;

            const category = await categoryService.updateCategory(id as string, {
                name,
                description,
                parentId,
            });

            res.json(category);
        } catch (error: any) {
            console.error('Error updating category:', error);
            res.status(400).json({ error: error.message || 'Failed to update category' });
        }
    },

    /**
     * DELETE /api/categories/:id
     * Delete a category
     */
    async deleteCategory(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await categoryService.deleteCategory(id as string);
            res.status(204).send();
        } catch (error: any) {
            console.error('Error deleting category:', error);
            res.status(400).json({ error: error.message || 'Failed to delete category' });
        }
    },
};

