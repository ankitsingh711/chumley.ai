import { Request, Response } from 'express';
import { RequestStatus, OrderStatus, UserRole } from '@prisma/client';
import Logger from '../utils/logger';
import { startOfMonth, subMonths, format } from 'date-fns';
import prisma from '../config/db';
import { CacheService } from '../utils/cache';

const normalizeDepartmentLabel = (value?: string | null): string | undefined => {
    if (!value) return undefined;

    const trimmed = value.trim();
    const lowered = trimmed.toLowerCase();

    if (lowered === 'royston' || lowered === 'roystton') {
        return 'Chessington';
    }

    return trimmed;
};

export const getKPIs = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const user = req.user as any;

        // Build cache key
        const cacheKey = `kpis:${user?.id || 'all'}:${startDate || 'none'}:${endDate || 'none'}`;

        // Try cache first - CRITICAL for performance
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Build date filter
        const dateFilter: any = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate as string);
        }
        if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999); // Include the entire end date
            dateFilter.lte = end;
        }

        // --- RBAC FILTERING LOGIC ---
        // Base filters
        let orderDateFilter = Object.keys(dateFilter).length > 0
            ? { createdAt: dateFilter, status: { not: OrderStatus.CANCELLED } }
            : { status: { not: OrderStatus.CANCELLED } };

        let requestDateFilter = Object.keys(dateFilter).length > 0
            ? { createdAt: dateFilter }
            : {};

        // Role-based logic
        let orderWhere: any = { ...orderDateFilter };
        let requestWhere: any = { ...requestDateFilter };

        if (!user || user.role === UserRole.SYSTEM_ADMIN) {
            // No additional filters for admins
        } else if (
            user.role === UserRole.MANAGER ||
            user.role === UserRole.SENIOR_MANAGER
        ) {
            // Filter by Department
            if (user.departmentId) {
                // Filter Orders: linked request -> requester -> departmentId
                orderWhere.request = {
                    requester: { departmentId: user.departmentId }
                };
                // Filter Requests: requester -> departmentId
                requestWhere.requester = { departmentId: user.departmentId };
            } else {
                // Fallback: If manager has no department, show only own
                orderWhere.request = { requesterId: user.id };
                requestWhere.requesterId = user.id;
            }
        } else {
            // Members: Show strictly own requests/orders
            orderWhere.request = { requesterId: user.id };
            requestWhere.requesterId = user.id;
        }

        const totalSpendResult = await prisma.purchaseOrder.aggregate({
            _sum: { totalAmount: true },
            where: orderWhere,
        });
        const totalSpend = totalSpendResult._sum.totalAmount || 0;

        const totalRequests = await prisma.purchaseRequest.count({
            where: requestWhere,
        });

        const pendingRequests = await prisma.purchaseRequest.count({
            where: { ...requestWhere, status: RequestStatus.PENDING },
        });

        const approvedRequests = await prisma.purchaseRequest.count({
            where: { ...requestWhere, status: RequestStatus.APPROVED },
        });

        const rejectedRequests = await prisma.purchaseRequest.count({
            where: { ...requestWhere, status: RequestStatus.REJECTED },
        });

        const totalOrders = await prisma.purchaseOrder.count({
            where: orderWhere,
        });

        // Calculate spend by department/category
        const ordersWithDept = await prisma.purchaseOrder.findMany({
            where: orderWhere,
            include: {
                request: {
                    select: {
                        budgetCategory: true,
                        requester: {
                            select: { department: true }
                        }
                    }
                }
            }
        });

        const departmentSpend: Record<string, number> = {};
        ordersWithDept.forEach(order => {
            // Prioritize budgetCategory set on the request, fallback to user department name
            const budgetCategory = normalizeDepartmentLabel(order.request?.budgetCategory);
            const departmentName = normalizeDepartmentLabel(order.request?.requester?.department?.name);
            const category = budgetCategory || departmentName || 'General / Uncategorized';
            departmentSpend[category] = (departmentSpend[category] || 0) + Number(order.totalAmount);
        });

        // Calculate average processing time
        const completedRequests = await prisma.purchaseRequest.findMany({
            where: {
                ...requestWhere,
                status: { in: [RequestStatus.APPROVED, RequestStatus.REJECTED] }
            },
            select: {
                createdAt: true,
                updatedAt: true,
            }
        });

        let avgProcessingTime = 0;
        if (completedRequests.length > 0) {
            const totalDays = completedRequests.reduce((sum, req) => {
                const days = Math.floor((req.updatedAt.getTime() - req.createdAt.getTime()) / (1000 * 60 * 60 * 24));
                return sum + days;
            }, 0);
            avgProcessingTime = totalDays / completedRequests.length;
        }

        const result = {
            totalRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            totalOrders,
            totalSpend,
            departmentSpend,
            avgProcessingTime,
        };

        // Cache for 5 minutes
        await CacheService.set(cacheKey, result, 300);

        res.json(result);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getMonthlySpend = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;
        const user = req.user as any;

        // Build cache key
        const cacheKey = `monthly-spend:${user?.id || 'all'}:${startDate || 'none'}:${endDate || 'none'}`;

        // Try cache first
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Default to last 6 months if no date range provided
        let start = subMonths(new Date(), 5);
        let end = new Date();

        if (startDate) {
            start = new Date(startDate as string);
        }
        if (endDate) {
            end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
        }

        // --- RBAC FILTERING LOGIC ---
        let where: any = {
            createdAt: { gte: start, lte: end },
            status: { not: OrderStatus.CANCELLED },
        };

        if (!user || user.role === UserRole.SYSTEM_ADMIN) {
            // No filters
        } else if (
            user.role === UserRole.MANAGER ||
            user.role === UserRole.SENIOR_MANAGER
        ) {
            if (user.departmentId) {
                where.request = {
                    requester: { departmentId: user.departmentId }
                };
            } else {
                where.request = { requesterId: user.id };
            }
        } else {
            // Member
            where.request = { requesterId: user.id };
        }

        const orders = await prisma.purchaseOrder.findMany({
            where,
            include: {
                request: {
                    select: {
                        budgetCategory: true,
                        requester: {
                            select: { department: true }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        const spendByMonth: Record<string, any> = {};

        // Pre-fill all months in the date range
        let currentMonth = startOfMonth(start);
        const endMonth = startOfMonth(end);

        while (currentMonth <= endMonth) {
            const monthStr = format(currentMonth, 'MMM yyyy');
            spendByMonth[monthStr] = { month: monthStr, spend: 0 };
            currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
        }

        orders.forEach(order => {
            const month = format(order.createdAt, 'MMM yyyy');
            const amount = Number(order.totalAmount);

            // Prioritize budgetCategory, fallback to department name
            const budgetCategory = normalizeDepartmentLabel(order.request?.budgetCategory);
            // Handle case where department might be a string or object with name property, 
            // but prisma strongly types relations usually so we expect an object or null
            const objDeptNameRaw = typeof order.request?.requester?.department === 'object' && order.request?.requester?.department !== null
                ? (order.request?.requester?.department as any).name
                : order.request?.requester?.department;
            const objDeptName = normalizeDepartmentLabel(objDeptNameRaw);

            const category = budgetCategory || objDeptName || 'General / Uncategorized';

            if (!spendByMonth[month]) {
                spendByMonth[month] = { month, spend: 0 };
            }

            spendByMonth[month].spend += amount;
            spendByMonth[month][category] = (spendByMonth[month][category] || 0) + amount;
        });

        const chartData = Object.values(spendByMonth);

        // Cache for 1 hour (spend data changes less frequently)
        await CacheService.set(cacheKey, chartData, 3600);


        res.json(chartData);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getDepartmentSpendBreakdown = async (req: Request, res: Response) => {
    try {
        const { departmentId, startDate, endDate } = req.query;
        const user = req.user as any;

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Validation: Ensure departmentId is provided
        if (!departmentId) {
            return res.status(400).json({ error: 'Department ID is required' });
        }
        const requestedDepartmentId = String(departmentId);

        // RBAC: Check if user has access to this department's data
        if (user.role !== UserRole.SYSTEM_ADMIN && user.departmentId !== requestedDepartmentId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Build cache key
        const cacheKey = `dept-spend-breakdown:${user.id}:${requestedDepartmentId}:${startDate || 'none'}:${endDate || 'none'}`;

        // Try cache first
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Date filters
        const dateFilter: any = {};
        if (startDate) {
            dateFilter.gte = new Date(startDate as string);
        }
        if (endDate) {
            const end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
            dateFilter.lte = end;
        }

        const dateWhere = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

        // 1. Fetch all categories for this department to build hierarchy
        const categories = await prisma.spendingCategory.findMany({
            where: { departmentId: requestedDepartmentId },
            select: { id: true, name: true, parentId: true }
        });

        // Map for O(1) lookup
        const categoryMap = new Map<string, { name: string; parentId: string | null }>();
        categories.forEach(c => categoryMap.set(c.id, { name: c.name, parentId: c.parentId }));

        // Helper to find root category
        const getRootCategoryName = (categoryId: string): string => {
            let currentId = categoryId;
            let current = categoryMap.get(currentId);
            let depth = 0;

            // Traverse up
            while (current && current.parentId && depth < 10) {
                currentId = current.parentId;
                current = categoryMap.get(currentId);
                depth++;
            }

            return current ? current.name : 'General / Uncategorized';
        };

        // 2. Fetch orders for this department
        const orders = await prisma.purchaseOrder.findMany({
            where: {
                status: { not: OrderStatus.CANCELLED },
                ...dateWhere,
                request: {
                    requester: {
                        departmentId: requestedDepartmentId
                    }
                }
            },
            include: {
                request: {
                    select: {
                        budgetCategory: true,
                        // We need key ID to resolve hierarchy
                        categoryId: true,
                        category: { select: { name: true } }
                    }
                }
            }
        });

        // 3. Group by category
        const categorySpend: Record<string, number> = {};

        orders.forEach(order => {
            let categoryName = 'General / Uncategorized';

            if (order.request?.categoryId) {
                // Use hierarchy rollup
                categoryName = getRootCategoryName(order.request.categoryId);
            } else if (order.request?.budgetCategory && order.request.budgetCategory !== 'Unassigned') {
                // Fallback to legacy field if meaningful (not 'Unassigned')
                // But wait, budgetCategory is often the Department Name. We probably shouldn't use it for category breakdown unless we are sure.
                // If we have no categoryId, it really is unassigned or 'General'
                categoryName = 'General / Uncategorized';
            }

            categorySpend[categoryName] = (categorySpend[categoryName] || 0) + Number(order.totalAmount);
        });

        // Format as array
        const result = Object.entries(categorySpend)
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount);

        // Cache for 5 minutes
        await CacheService.set(cacheKey, result, 300);

        res.json(result);

    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
