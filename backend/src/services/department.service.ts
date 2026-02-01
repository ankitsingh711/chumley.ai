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
        const departments = await prisma.department.findMany({
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

        // Calculate spending for each department
        // We group by requester's department ID since requests are linked to users, who are linked to departments
        // Note: Prisma doesn't support deep relation grouping easily in one go, so we fetch requests
        // A more optimized SQL query would be better for scale, but this works for now.

        // Let's get all approved requests and sum them up by department in code or via a specific query if possible.
        // Since we need to join PurchaseRequest -> User -> Department, simple groupBy might be tricky if departmentId isn't on PurchaseRequest.
        // Wait, schema check: PurchaseRequest has requesterId, User has departmentId. 
        // We can't do PurchaseRequest.groupBy({ by: ['requester.departmentId'] }).

        // Alternative: Fetch all approved requests with minimal fields and aggregate in memory (ok for smaller datasets)
        // OR better: loop through departments and get spending (N+1 but safe)
        // OR best: Use raw query.

        // Let's stick to a robust enough method: finding all approved requests with their user's dept ID.
        const approvedRequests = await prisma.purchaseRequest.findMany({
            where: { status: 'APPROVED' },
            select: {
                totalAmount: true,
                requester: {
                    select: { departmentId: true }
                }
            }
        });

        const spendingMap = new Map<string, number>();

        approvedRequests.forEach(req => {
            if (req.requester?.departmentId) {
                const current = spendingMap.get(req.requester.departmentId) || 0;
                spendingMap.set(req.requester.departmentId, current + Number(req.totalAmount));
            }
        });

        return departments.map(dept => ({
            ...dept,
            metrics: {
                totalSpent: spendingMap.get(dept.id) || 0,
                requestCount: 0, // Placeholder or calculate if needed
                userCount: dept._count.users
            }
        }));
    }
}

export default new DepartmentService();
