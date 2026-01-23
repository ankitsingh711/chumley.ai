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

        const activeRequests = await prisma.purchaseRequest.count({
            where: { status: RequestStatus.PENDING },
        });

        const pendingApprovals = await prisma.purchaseRequest.count({
            where: { status: RequestStatus.PENDING }, // Simplification
        });

        // Dummy avg fulfillment time logic for now
        const avgFulfillment = '2.5 Days';

        res.json({
            totalSpend,
            activeRequests,
            pendingApprovals,
            avgFulfillment,
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
