import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DateRange {
    startDate: Date;
    endDate: Date;
}

export class DepartmentService {
    /**
     * Get department hierarchy tree
     */
    async getDepartmentTree(departmentId: string) {
        const department = await prisma.department.findUnique({
            where: { id: departmentId },
            include: {
                users: {
                    include: {
                        reportees: true,
                        manager: true
                    }
                },
                categories: {
                    include: {
                        children: true
                    }
                }
            }
        });

        return department;
    }

    /**
     * Get all managers in a department
     */
    async getManagers(departmentId: string) {
        const managers = await prisma.user.findMany({
            where: {
                departmentId,
                role: {
                    in: ['MANAGER', 'SENIOR_MANAGER', 'SYSTEM_ADMIN']
                }
            },
            include: {
                reportees: true
            }
        });

        return managers;
    }

    /**
     * Calculate department spending
     */
    async getDepartmentSpending(departmentId: string, dateRange?: DateRange) {
        const where: any = {
            requester: {
                departmentId
            },
            status: 'APPROVED'
        };

        if (dateRange) {
            where.createdAt = {
                gte: dateRange.startDate,
                lte: dateRange.endDate
            };
        }

        const requests = await prisma.purchaseRequest.findMany({
            where,
            select: {
                totalAmount: true,
                createdAt: true,
                category: {
                    select: {
                        name: true
                    }
                }
            }
        });

        const totalSpent = requests.reduce((sum, req) => sum + Number(req.totalAmount), 0);

        return {
            totalSpent,
            requestCount: requests.length,
            requests
        };
    }

    /**
     * Get spending by category
     */
    async getSpendingByCategory(departmentId: string) {
        const requests = await prisma.purchaseRequest.findMany({
            where: {
                requester: {
                    departmentId
                },
                status: 'APPROVED'
            },
            include: {
                category: true
            }
        });

        const spendingByCategory: Record<string, number> = {};

        requests.forEach(req => {
            const categoryName = req.category?.name || 'Uncategorized';
            spendingByCategory[categoryName] = (spendingByCategory[categoryName] || 0) + Number(req.totalAmount);
        });

        return spendingByCategory;
    }

    /**
     * Get all departments
     */
    async getAllDepartments() {
        return prisma.department.findMany({
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true
                    }
                },
                _count: {
                    select: {
                        users: true,
                        categories: true
                    }
                }
            }
        });
    }
}

export default new DepartmentService();
