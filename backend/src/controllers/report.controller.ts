import { Request, Response } from 'express';
import { PrismaClient, RequestStatus, OrderStatus } from '@prisma/client';
import Logger from '../utils/logger';
import { startOfMonth, subMonths, format } from 'date-fns';

const prisma = new PrismaClient();

export const getKPIs = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

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

        const whereClause = Object.keys(dateFilter).length > 0
            ? { createdAt: dateFilter, status: { not: OrderStatus.CANCELLED } }
            : { status: { not: OrderStatus.CANCELLED } };

        const requestWhereClause = Object.keys(dateFilter).length > 0
            ? { createdAt: dateFilter }
            : {};

        const totalSpendResult = await prisma.purchaseOrder.aggregate({
            _sum: { totalAmount: true },
            where: whereClause,
        });
        const totalSpend = totalSpendResult._sum.totalAmount || 0;

        const totalRequests = await prisma.purchaseRequest.count({
            where: requestWhereClause,
        });

        const pendingRequests = await prisma.purchaseRequest.count({
            where: { ...requestWhereClause, status: RequestStatus.PENDING },
        });

        const approvedRequests = await prisma.purchaseRequest.count({
            where: { ...requestWhereClause, status: RequestStatus.APPROVED },
        });

        const rejectedRequests = await prisma.purchaseRequest.count({
            where: { ...requestWhereClause, status: RequestStatus.REJECTED },
        });

        const totalOrders = await prisma.purchaseOrder.count({
            where: whereClause,
        });

        // Calculate spend by department
        // Calculate spend by department/category
        const ordersWithDept = await prisma.purchaseOrder.findMany({
            where: whereClause,
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
            // Prioritize budgetCategory set on the request, fallback to user department
            const category = order.request?.budgetCategory || order.request?.requester?.department || 'Unassigned';
            departmentSpend[category] = (departmentSpend[category] || 0) + Number(order.totalAmount);
        });

        // Calculate average processing time
        const completedRequests = await prisma.purchaseRequest.findMany({
            where: {
                ...requestWhereClause,
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

        res.json({
            totalRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            totalOrders,
            totalSpend,
            departmentSpend,
            avgProcessingTime,
        });
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getMonthlySpend = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        // Default to last 6 months if no date range provided
        let start = subMonths(new Date(), 6);
        let end = new Date();

        if (startDate) {
            start = new Date(startDate as string);
        }
        if (endDate) {
            end = new Date(endDate as string);
            end.setHours(23, 59, 59, 999);
        }

        const orders = await prisma.purchaseOrder.findMany({
            where: {
                createdAt: { gte: start, lte: end },
                status: { not: OrderStatus.CANCELLED },
            },
            select: {
                createdAt: true,
                totalAmount: true,
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        const spendByMonth: Record<string, number> = {};

        orders.forEach(order => {
            const month = format(order.createdAt, 'MMM yyyy');
            const amount = Number(order.totalAmount);
            spendByMonth[month] = (spendByMonth[month] || 0) + amount;
        });

        const chartData = Object.entries(spendByMonth).map(([month, spend]) => ({
            month,
            spend
        }));

        res.json(chartData);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
