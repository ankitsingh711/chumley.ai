import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { hierarchyService } from '../services/hierarchy.service';
import { Branch, UserRole } from '@prisma/client';

const isSystemAdmin = (req: Request): boolean => req.user?.role === UserRole.SYSTEM_ADMIN;

const ensureDepartmentAccess = (req: Request, res: Response, departmentId: string): boolean => {
    if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return false;
    }

    if (isSystemAdmin(req)) {
        return true;
    }

    if (!req.user.departmentId || req.user.departmentId !== departmentId) {
        res.status(403).json({ error: 'Access denied' });
        return false;
    }

    return true;
};

const ensureCategoryAccess = async (req: Request, res: Response, categoryId: string) => {
    const category = await categoryService.getCategoryById(categoryId);
    if (!category) {
        res.status(404).json({ error: 'Category not found' });
        return null;
    }

    if (!ensureDepartmentAccess(req, res, category.departmentId)) {
        return null;
    }

    return category;
};

export const categoryController = {
    /**
     * GET /api/categories
     * Get all categories with pagination and filtering
     */
    async getAllCategories(req: Request, res: Response) {
        try {
            const { departmentId, page, limit, search } = req.query;
            const requestedDepartmentId = typeof departmentId === 'string' ? departmentId : undefined;

            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!isSystemAdmin(req)) {
                if (!req.user.departmentId) {
                    return res.status(403).json({ error: 'Access denied' });
                }

                if (requestedDepartmentId && requestedDepartmentId !== req.user.departmentId) {
                    return res.status(403).json({ error: 'Access denied' });
                }
            }

            const result = await categoryService.getAllCategories({
                departmentId: isSystemAdmin(req) ? requestedDepartmentId : req.user.departmentId || undefined,
                page: page ? parseInt(page as string) : 1,
                limit: limit ? parseInt(limit as string) : 10,
                search: typeof search === 'string' ? search : undefined
            });

            res.json(result);
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

            if (!ensureDepartmentAccess(req, res, String(departmentId))) {
                return;
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
            const requestedDepartmentId = typeof departmentId === 'string' ? departmentId : undefined;

            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (branch && departmentId) {
                if (!ensureDepartmentAccess(req, res, String(departmentId))) {
                    return;
                }

                const branchEnum = branch.toString().toUpperCase() as Branch;
                const tree = await hierarchyService.getHierarchyTree(
                    branchEnum,
                    departmentId as string
                );
                return res.json(tree);
            }

            if (!isSystemAdmin(req) && !requestedDepartmentId) {
                if (!req.user.departmentId) {
                    return res.status(403).json({ error: 'Access denied' });
                }
            }

            if (requestedDepartmentId && !ensureDepartmentAccess(req, res, requestedDepartmentId)) {
                return;
            }

            const tree = await categoryService.getCategoryTree(
                isSystemAdmin(req) ? requestedDepartmentId : req.user.departmentId || undefined
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

            if (!ensureDepartmentAccess(req, res, departmentId as string)) {
                return;
            }

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

            const category = await ensureCategoryAccess(req, res, id as string);
            if (!category) {
                return;
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

            const accessibleCategory = await ensureCategoryAccess(req, res, id as string);
            if (!accessibleCategory) {
                return;
            }

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

            if (!ensureDepartmentAccess(req, res, String(departmentId))) {
                return;
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

            const accessibleCategory = await ensureCategoryAccess(req, res, id as string);
            if (!accessibleCategory) {
                return;
            }

            const updatedCategory = await categoryService.updateCategory(id as string, {
                name,
                description,
                parentId,
            });

            res.json(updatedCategory);
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

            const accessibleCategory = await ensureCategoryAccess(req, res, id as string);
            if (!accessibleCategory) {
                return;
            }

            await categoryService.deleteCategory(id as string);
            res.status(204).send();
        } catch (error: any) {
            console.error('Error deleting category:', error);
            res.status(400).json({ error: error.message || 'Failed to delete category' });
        }
    },
};
