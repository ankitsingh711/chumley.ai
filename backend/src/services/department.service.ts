import prisma from '../config/db';


interface DateRange {
    startDate: Date;
    endDate: Date;
}

interface UpdateDepartmentData {
    budget?: number;
    description?: string | null;
}

const DEPARTMENT_NAME_EXCLUSIONS = ['Royston', 'Roystton', 'royston', 'roystton'];

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
     * Update department fields (budget, description)
     */
    async updateDepartment(
        departmentId: string,
        data: UpdateDepartmentData,
        user?: { role?: string; departmentId?: string }
    ) {
        const existingDepartment = await prisma.department.findUnique({
            where: { id: departmentId },
            select: { id: true }
        });

        if (!existingDepartment) {
            return null;
        }

        // RBAC: System Admin can update any department, Senior Manager only their own.
        if (user) {
            const role = user.role;
            const userDepartmentId = user.departmentId;

            if (role === 'SYSTEM_ADMIN') {
                // allowed
            } else if (role === 'SENIOR_MANAGER') {
                if (!userDepartmentId || userDepartmentId !== departmentId) {
                    throw new Error('FORBIDDEN');
                }
            } else {
                throw new Error('FORBIDDEN');
            }
        }

        const updateData: UpdateDepartmentData = {};

        if (typeof data.budget === 'number') {
            updateData.budget = data.budget;
        }

        if (Object.prototype.hasOwnProperty.call(data, 'description')) {
            updateData.description = data.description ?? null;
        }

        const updatedDepartment = await prisma.department.update({
            where: { id: departmentId },
            data: updateData
        });

        return updatedDepartment;
    }

    /**
     * Get all departments
     */
    /**
     * Get all departments (Filtered by User Role)
     */
    async getAllDepartments(user?: any) {
        let where: any = {};

        // RBAC: Filter departments based on user role
        if (user && user.role !== 'SYSTEM_ADMIN') {
            if (user.departmentId) {
                where = { id: user.departmentId };
            } else {
                // User has no department, return empty list (or handle as needed)
                return [];
            }
        }

        where = {
            ...where,
            name: { notIn: DEPARTMENT_NAME_EXCLUSIONS },
        };

        const departments = await prisma.department.findMany({
            where,
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
        // We only need to fetch approved requests for the departments we found.
        const departmentIds = departments.map(d => d.id);

        const approvedRequests = await prisma.purchaseRequest.findMany({
            where: {
                status: 'APPROVED',
                requester: {
                    departmentId: { in: departmentIds }
                }
            },
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
