import { PrismaClient, SpendingCategory, Branch } from '@prisma/client';

const prisma = new PrismaClient();

interface CategoryTreeNode extends SpendingCategory {
    children: CategoryTreeNode[];
}

export const categoryService = {
    /**
     * Get all categories with pagination and filtering
     */
    async getAllCategories(options: {
        departmentId?: string;
        page?: number;
        limit?: number;
        search?: string;
    } = {}) {
        const { departmentId, page = 1, limit = 10, search } = options;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (departmentId) {
            where.departmentId = departmentId;
        }

        if (search) {
            where.OR = [
                { name: { contains: search } },
                { description: { contains: search } }
            ];
        }

        const [total, data] = await Promise.all([
            prisma.spendingCategory.count({ where }),
            prisma.spendingCategory.findMany({
                where,
                include: {
                    parent: true,
                    children: true,
                    department: true,
                },
                orderBy: {
                    name: 'asc',
                },
                skip,
                take: limit,
            })
        ]);

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    },

    /**
     * Get a single category by ID
     */
    async getCategoryById(id: string): Promise<SpendingCategory | null> {
        return await prisma.spendingCategory.findUnique({
            where: { id },
            include: {
                parent: true,
                children: true,
                department: true,
                requests: true,
            },
        });
    },

    /**
     * Get hierarchical tree structure for a department
     */
    async getCategoryTree(departmentId?: string): Promise<CategoryTreeNode[]> {
        const categories = await prisma.spendingCategory.findMany({
            where: departmentId ? { departmentId } : undefined,
            include: {
                children: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        // Build tree structure
        const categoryMap = new Map<string, CategoryTreeNode>();
        const rootCategories: CategoryTreeNode[] = [];

        // First pass: create map of all categories
        categories.forEach((cat) => {
            categoryMap.set(cat.id, { ...cat, children: [] });
        });

        // Second pass: build tree
        categories.forEach((cat) => {
            const node = categoryMap.get(cat.id)!;
            if (cat.parentId) {
                const parent = categoryMap.get(cat.parentId);
                if (parent) {
                    parent.children.push(node);
                }
            } else {
                rootCategories.push(node);
            }
        });

        return rootCategories;
    },

    /**
     * Get all categories for a specific department
     */
    async getCategoriesByDepartment(departmentId: string): Promise<SpendingCategory[]> {
        return await prisma.spendingCategory.findMany({
            where: { departmentId },
            include: {
                parent: true,
                children: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    },

    /**
     * Create a new category
     */
    async createCategory(data: {
        name: string;
        description?: string;
        parentId?: string;
        departmentId: string;
        branch: Branch;
    }): Promise<SpendingCategory> {
        // Validate parent exists if provided
        if (data.parentId) {
            const parent = await prisma.spendingCategory.findUnique({
                where: { id: data.parentId },
            });
            if (!parent) {
                throw new Error('Parent category not found');
            }
            // Ensure parent belongs to same department
            if (parent.departmentId !== data.departmentId) {
                throw new Error('Parent category must belong to the same department');
            }
            // Ensure parent belongs to same branch
            if (parent.branch !== data.branch) {
                throw new Error('Parent category must belong to the same branch');
            }
        }

        return await prisma.spendingCategory.create({
            data,
            include: {
                parent: true,
                department: true,
            },
        });
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
    ): Promise<SpendingCategory> {
        // Validate the category exists
        const existing = await prisma.spendingCategory.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new Error('Category not found');
        }

        // Prevent circular references
        if (data.parentId) {
            if (data.parentId === id) {
                throw new Error('Category cannot be its own parent');
            }

            // Check if the new parent is a descendant
            const isDescendant = await this.isDescendant(id, data.parentId);
            if (isDescendant) {
                throw new Error('Cannot set a descendant as parent (would create circular reference)');
            }

            // Validate parent exists and belongs to same department
            const parent = await prisma.spendingCategory.findUnique({
                where: { id: data.parentId },
            });
            if (!parent) {
                throw new Error('Parent category not found');
            }
            if (parent.departmentId !== existing.departmentId) {
                throw new Error('Parent category must belong to the same department');
            }
        }

        return await prisma.spendingCategory.update({
            where: { id },
            data,
            include: {
                parent: true,
                children: true,
                department: true,
            },
        });
    },

    /**
     * Delete a category
     */
    async deleteCategory(id: string): Promise<void> {
        const category = await prisma.spendingCategory.findUnique({
            where: { id },
            include: {
                children: true,
                requests: true,
            },
        });

        if (!category) {
            throw new Error('Category not found');
        }

        if (category.children.length > 0) {
            throw new Error('Cannot delete category with children. Delete or reassign children first.');
        }

        if (category.requests.length > 0) {
            throw new Error('Cannot delete category with associated purchase requests.');
        }

        await prisma.spendingCategory.delete({
            where: { id },
        });
    },

    /**
     * Check if targetId is a descendant of ancestorId
     */
    async isDescendant(ancestorId: string, targetId: string): Promise<boolean> {
        let current = await prisma.spendingCategory.findUnique({
            where: { id: targetId },
            select: { parentId: true },
        });

        while (current && current.parentId) {
            if (current.parentId === ancestorId) {
                return true;
            }
            current = await prisma.spendingCategory.findUnique({
                where: { id: current.parentId },
                select: { parentId: true },
            });
        }

        return false;
    },

    /**
     * Get full path for a category (breadcrumb)
     */
    async getCategoryPath(id: string): Promise<SpendingCategory[]> {
        const path: SpendingCategory[] = [];
        let current = await prisma.spendingCategory.findUnique({
            where: { id },
        });

        while (current) {
            path.unshift(current);
            if (current.parentId) {
                current = await prisma.spendingCategory.findUnique({
                    where: { id: current.parentId },
                });
            } else {
                current = null;
            }
        }

        return path;
    },
};
