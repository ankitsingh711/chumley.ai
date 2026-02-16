import { Branch } from '@prisma/client';
import Logger from '../utils/logger';
import prisma from '../config/db';


export const hierarchyService = {
    /**
     * Get categories for a specific branch and department
     */
    async getCategoriesByBranchAndDepartment(
        branch: Branch,
        departmentId: string
    ) {
        return await prisma.spendingCategory.findMany({
            where: {
                branch,
                departmentId,
            },
            include: {
                parent: true,
                children: true,
                department: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    },

    /**
     * Get hierarchical tree structure for a branch and department
     */
    async getHierarchyTree(branch: Branch, departmentId: string) {
        const categories = await prisma.spendingCategory.findMany({
            where: {
                branch,
                departmentId,
            },
            include: {
                children: true,
                department: true,
            },
            orderBy: {
                name: 'asc',
            },
        });

        // Build tree structure
        const categoryMap = new Map();
        const rootCategories: any[] = [];

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
     * Seed hierarchy data from JSON structure
     */
    async seedHierarchyData(hierarchyData: Record<string, any>) {
        const stats = {
            branches: 0,
            departments: 0,
            categories: 0,
        };

        for (const [branchName, branchData] of Object.entries(hierarchyData)) {
            const branch = branchName.toUpperCase() as Branch;
            stats.branches++;

            Logger.info(`Seeding branch: ${branchName}`);

            for (const [departmentName, departmentData] of Object.entries(branchData as Record<string, any>)) {
                // Find or create department
                let department = await prisma.department.findFirst({
                    where: { name: departmentName },
                });

                if (!department) {
                    department = await prisma.department.create({
                        data: {
                            name: departmentName,
                            description: `${departmentName} Department`,
                        },
                    });
                    stats.departments++;
                }

                Logger.info(`  Department: ${departmentName}`);

                // Process spending categories recursively
                const categoriesCreated = await this.createCategoriesRecursively(
                    branch,
                    department.id,
                    departmentData as Record<string, any>,
                    null
                );

                stats.categories += categoriesCreated;
            }
        }

        return stats;
    },

    /**
     * Recursively create categories from nested object structure
     */
    async createCategoriesRecursively(
        branch: Branch,
        departmentId: string,
        categoryData: Record<string, any>,
        parentId: string | null,
        depth: number = 0
    ): Promise<number> {
        let count = 0;

        for (const [categoryName, subcategories] of Object.entries(categoryData)) {
            // Check if category already exists
            const existing = await prisma.spendingCategory.findFirst({
                where: {
                    name: categoryName,
                    departmentId,
                    branch,
                    parentId,
                },
            });

            let category;
            if (existing) {
                category = existing;
            } else {
                // Create the category
                category = await prisma.spendingCategory.create({
                    data: {
                        name: categoryName,
                        departmentId,
                        branch,
                        parentId,
                    },
                });
                count++;

                if (depth === 0) {
                    Logger.info(`    └─ ${categoryName}`);
                }
            }

            // If subcategories is an object (not an array), recursively create them
            if (subcategories && typeof subcategories === 'object' && !Array.isArray(subcategories)) {
                const subCount = await this.createCategoriesRecursively(
                    branch,
                    departmentId,
                    subcategories,
                    category.id,
                    depth + 1
                );
                count += subCount;
            } else if (Array.isArray(subcategories) && subcategories.length > 0) {
                // If it's an array with items, create leaf categories
                for (const leafName of subcategories) {
                    if (typeof leafName === 'string') {
                        const existingLeaf = await prisma.spendingCategory.findFirst({
                            where: {
                                name: leafName,
                                departmentId,
                                branch,
                                parentId: category.id,
                            },
                        });

                        if (!existingLeaf) {
                            await prisma.spendingCategory.create({
                                data: {
                                    name: leafName,
                                    departmentId,
                                    branch,
                                    parentId: category.id,
                                },
                            });
                            count++;
                        }
                    }
                }
            }
        }

        return count;
    },
};
