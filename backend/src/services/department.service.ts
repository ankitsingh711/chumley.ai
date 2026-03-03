import prisma from '../config/db';


interface DateRange {
    startDate: Date;
    endDate: Date;
}

interface UpdateDepartmentData {
    budget?: number;
    description?: string | null;
}

const CANONICAL_DEPARTMENT_NAMES = [
    'Tech',
    'Marketing',
    'Support',
    'Finance',
    'HR&Recruitments',
    'Sector Group',
    'Trade Group',
    'Fleet&Assets',
];

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

const LEGACY_DEPARTMENT_ALIASES: Record<string, string> = {
    royston: 'Tech',
    roystton: 'Tech',
    chessington: 'Tech',
    'hr & recruitment': 'HR&Recruitments',
    'hr&recruitment': 'HR&Recruitments',
    'hr and recruitment': 'HR&Recruitments',
    'hr & recruitments': 'HR&Recruitments',
    'hr and recruitments': 'HR&Recruitments',
    fleet: 'Fleet&Assets',
    assets: 'Fleet&Assets',
    'fleet & assets': 'Fleet&Assets',
};

const CANONICAL_DEPARTMENT_LOOKUP: Record<string, string> = Object.fromEntries(
    CANONICAL_DEPARTMENT_NAMES.map((name) => [name.toLowerCase(), name]),
);

const normalizeDepartmentName = (value?: string | null): string | undefined => {
    if (!value) return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const lowered = trimmed.toLowerCase();
    return LEGACY_DEPARTMENT_ALIASES[lowered] || CANONICAL_DEPARTMENT_LOOKUP[lowered] || trimmed;
};

const resolveMonthlyBudget = (departmentName: string, currentBudget: unknown): number => {
    const normalizedName = normalizeDepartmentName(departmentName);
    const defaultBudget = normalizedName ? (MONTHLY_DEPARTMENT_BUDGETS[normalizedName] || 0) : 0;
    const numericBudget = Number(currentBudget || 0);

    return numericBudget > 0 ? numericBudget : defaultBudget;
};

const getDepartmentPriorityScore = (
    department: {
        id: string;
        budget?: unknown;
        _count?: { categories?: number | null };
        metrics?: { totalSpent?: number; requestCount?: number; userCount?: number };
    },
    userDepartmentId?: string,
) => {
    const sameAsUserDepartment = userDepartmentId && department.id === userDepartmentId ? 1_000_000 : 0;
    const budgetScore = Number(department.budget || 0) > 0 ? 10_000 : 0;
    const categoryScore = Number(department._count?.categories || 0) * 100;
    const requestScore = Number(department.metrics?.requestCount || 0) * 10;
    const userScore = Number(department.metrics?.userCount || 0);
    const spendScore = Number(department.metrics?.totalSpent || 0) > 0 ? 1 : 0;

    return sameAsUserDepartment + budgetScore + categoryScore + requestScore + userScore + spendScore;
};

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
            if (!user.departmentId) {
                // User has no department, return empty list (or handle as needed)
                return [];
            }

            const userDepartment = await prisma.department.findUnique({
                where: { id: user.departmentId },
                select: { name: true },
            });

            const normalizedDepartmentName = normalizeDepartmentName(userDepartment?.name);
            if (!normalizedDepartmentName || !CANONICAL_DEPARTMENT_NAMES.includes(normalizedDepartmentName)) {
                return [];
            }

            where = {
                OR: [
                    { id: user.departmentId },
                    { name: normalizedDepartmentName },
                ],
            };
        }

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
            },
            orderBy: {
                name: 'asc',
            },
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
        const requestCountMap = new Map<string, number>();

        approvedRequests.forEach(req => {
            if (req.requester?.departmentId) {
                const current = spendingMap.get(req.requester.departmentId) || 0;
                spendingMap.set(req.requester.departmentId, current + Number(req.totalAmount));

                const currentCount = requestCountMap.get(req.requester.departmentId) || 0;
                requestCountMap.set(req.requester.departmentId, currentCount + 1);
            }
        });

        const departmentsWithMetrics = departments.map(dept => {
            const normalizedName = normalizeDepartmentName(dept.name) || dept.name;
            const resolvedBudget = resolveMonthlyBudget(normalizedName, dept.budget);

            return {
                ...dept,
                name: normalizedName,
                budget: resolvedBudget,
                metrics: {
                    totalSpent: spendingMap.get(dept.id) || 0,
                    requestCount: requestCountMap.get(dept.id) || 0,
                    userCount: dept._count.users
                }
            };
        });

        const dedupedByName = new Map<string, (typeof departmentsWithMetrics)[number]>();

        departmentsWithMetrics.forEach((department) => {
            if (!CANONICAL_DEPARTMENT_NAMES.includes(department.name)) {
                return;
            }

            const key = department.name.toLowerCase();
            const existing = dedupedByName.get(key);

            if (!existing) {
                dedupedByName.set(key, department);
                return;
            }

            const existingScore = getDepartmentPriorityScore(existing, user?.departmentId);
            const candidateScore = getDepartmentPriorityScore(department, user?.departmentId);
            const preferred = candidateScore > existingScore ? department : existing;
            const secondary = preferred === department ? existing : department;

            const usersById = new Map<string, typeof existing.users[number]>();
            [...existing.users, ...department.users].forEach((userItem) => {
                usersById.set(userItem.id, userItem);
            });
            const mergedUsers = Array.from(usersById.values());

            dedupedByName.set(key, {
                ...preferred,
                description: preferred.description ?? secondary.description ?? null,
                budget: Math.max(Number(existing.budget || 0), Number(department.budget || 0)),
                users: mergedUsers,
                _count: {
                    users: mergedUsers.length,
                    categories: Number(existing._count?.categories || 0) + Number(department._count?.categories || 0),
                },
                metrics: {
                    totalSpent: Number(existing.metrics?.totalSpent || 0) + Number(department.metrics?.totalSpent || 0),
                    requestCount: Number(existing.metrics?.requestCount || 0) + Number(department.metrics?.requestCount || 0),
                    userCount: mergedUsers.length,
                },
            });
        });

        const dedupedDepartments = Array.from(dedupedByName.values()).sort((a, b) =>
            CANONICAL_DEPARTMENT_NAMES.indexOf(a.name) - CANONICAL_DEPARTMENT_NAMES.indexOf(b.name),
        );

        return dedupedDepartments.map((department) => ({
            ...department,
            budget: resolveMonthlyBudget(department.name, department.budget),
            metrics: {
                ...department.metrics,
                userCount: department.users.length,
            }
        }));
    }
}

export default new DepartmentService();
