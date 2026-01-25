import { Request, Response } from 'express';
import { PrismaClient, RequestStatus, OrderStatus } from '@prisma/client';
import Logger from '../utils/logger';
import { startOfMonth, subMonths, format } from 'date-fns';

const prisma = new PrismaClient();

export const getKPIs = async (req: Request, res: Response) => {
    try {
        const totalSpendResult = await prisma.purchaseOrder.aggregate({
            _sum: { totalAmount: true },
            where: { status: { not: OrderStatus.CANCELLED } },
        });
        const totalSpend = totalSpendResult._sum.totalAmount || 0;

        const totalRequests = await prisma.purchaseRequest.count();

        const pendingRequests = await prisma.purchaseRequest.count({
            where: { status: RequestStatus.PENDING },
        });

        const approvedRequests = await prisma.purchaseRequest.count({
            where: { status: RequestStatus.APPROVED },
        });

        const rejectedRequests = await prisma.purchaseRequest.count({
            where: { status: RequestStatus.REJECTED },
        });

        const totalOrders = await prisma.purchaseOrder.count({
            where: { status: { not: OrderStatus.CANCELLED } },
        });

        // Calculate spend by department
        const ordersWithDept = await prisma.purchaseOrder.findMany({
            where: { status: { not: OrderStatus.CANCELLED } },
            include: {
                request: {
                    include: {
                        requester: {
                            select: { department: true }
                        }
                    }
                }
            }
        });

        const departmentSpend: Record<string, number> = {};
        ordersWithDept.forEach(order => {
            const dept = order.request?.requester?.department || 'Unassigned';
            departmentSpend[dept] = (departmentSpend[dept] || 0) + Number(order.totalAmount);
        });

        res.json({
            totalRequests,
            pendingRequests,
            approvedRequests,
            rejectedRequests,
            totalOrders,
            totalSpend,
            departmentSpend,
        });
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getMonthlySpend = async (req: Request, res: Response) => {
    try {
        // This requires raw query or some processing since Prisma aggregation is limited on dates
        // For simplicity, fetching last 6 months orders and processing in JS
        const sixMonthsAgo = subMonths(new Date(), 6);

        const orders = await prisma.purchaseOrder.findMany({
            where: {
                createdAt: { gte: sixMonthsAgo },
                status: { not: OrderStatus.CANCELLED },
            },
            select: {
                createdAt: true,
                totalAmount: true,
            },
        });

        const spendByMonth: Record<string, number> = {};

        orders.forEach(order => {
            const month = format(order.createdAt, 'MMM yyyy');
            const amount = Number(order.totalAmount);
            spendByMonth[month] = (spendByMonth[month] || 0) + amount;
        });

        const chartData = Object.entries(spendByMonth).map(([month, amount]) => ({
            name: month,
            value: amount
        }));

        res.json(chartData);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
