import { Request, Response } from 'express';
import { PaymentInstallmentStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';
import prisma from '../config/db';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';

const markPaidSchema = z.object({
    notes: z.string().optional(),
});

/**
 * GET /orders/:orderId/payments
 * List all payment installments for a specific order
 */
export const getPaymentsByOrder = async (req: Request, res: Response) => {
    try {
        const { orderId } = req.params as { orderId: string };
        const user = req.user! as any;

        // Verify the order exists and user has access
        const order = await prisma.purchaseOrder.findUnique({
            where: { id: orderId },
            include: {
                request: {
                    select: {
                        requesterId: true,
                        requester: { select: { departmentId: true } },
                    },
                },
            },
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Authorization
        if (user.role === UserRole.MEMBER && order.request.requesterId !== user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        if ([UserRole.MANAGER, UserRole.SENIOR_MANAGER].includes(user.role)) {
            const reqDeptId = order.request.requester?.departmentId || null;
            if (user.departmentId && reqDeptId !== user.departmentId) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const payments = await prisma.paymentSchedule.findMany({
            where: { orderId },
            orderBy: { installmentNo: 'asc' },
        });

        res.json(payments.map(p => ({
            ...p,
            amount: Number(p.amount),
        })));
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * PATCH /payments/:id/mark-paid
 * Mark a specific installment as paid
 */
export const markInstallmentPaid = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { notes } = markPaidSchema.parse(req.body);
        const user = req.user! as any;

        const installment = await prisma.paymentSchedule.findUnique({
            where: { id },
            include: {
                order: {
                    include: {
                        request: {
                            select: {
                                requesterId: true,
                                requester: { select: { departmentId: true } },
                            },
                        },
                    },
                },
            },
        });

        if (!installment) {
            return res.status(404).json({ error: 'Payment installment not found' });
        }

        if (installment.status === PaymentInstallmentStatus.PAID) {
            return res.status(400).json({ error: 'Installment is already paid' });
        }

        // Only Managers, Senior Managers, and Admins can mark as paid
        if (user.role === UserRole.MEMBER) {
            return res.status(403).json({ error: 'Members cannot mark installments as paid' });
        }

        if ([UserRole.MANAGER, UserRole.SENIOR_MANAGER].includes(user.role)) {
            const reqDeptId = installment.order.request.requester?.departmentId || null;
            if (user.departmentId && reqDeptId !== user.departmentId) {
                return res.status(403).json({ error: 'Access denied' });
            }
        }

        const updated = await prisma.paymentSchedule.update({
            where: { id },
            data: {
                status: PaymentInstallmentStatus.PAID,
                paidDate: new Date(),
                notes: notes || undefined,
            },
        });

        Logger.info(`Payment installment ${id} marked as PAID by ${user.id}`);

        // Check if all installments for this order are now paid
        const remaining = await prisma.paymentSchedule.count({
            where: {
                orderId: installment.orderId,
                status: { not: PaymentInstallmentStatus.PAID },
            },
        });

        res.json({
            ...updated,
            amount: Number(updated.amount),
            allPaid: remaining === 0,
        });
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

/**
 * GET /payments/overdue
 * List all overdue payment installments (for dashboard / alerts)
 */
export const getOverduePayments = async (req: Request, res: Response) => {
    try {
        const user = req.user! as any;
        const { page, limit, skip } = getPaginationParams(req);

        const where: any = {
            status: PaymentInstallmentStatus.PENDING,
            dueDate: { lt: new Date() },
        };

        // Scope by role
        if (user.role === UserRole.MEMBER) {
            where.order = { request: { requesterId: user.id } };
        } else if ([UserRole.MANAGER, UserRole.SENIOR_MANAGER].includes(user.role)) {
            if (user.departmentId) {
                where.order = { request: { requester: { departmentId: user.departmentId } } };
            }
        }

        const [payments, total] = await Promise.all([
            prisma.paymentSchedule.findMany({
                where,
                skip,
                take: limit,
                orderBy: { dueDate: 'asc' },
                include: {
                    order: {
                        select: {
                            id: true,
                            supplier: { select: { id: true, name: true } },
                            request: {
                                select: {
                                    id: true,
                                    requester: { select: { id: true, name: true } },
                                },
                            },
                        },
                    },
                },
            }),
            prisma.paymentSchedule.count({ where }),
        ]);

        const response = createPaginatedResponse(
            payments.map(p => ({
                ...p,
                amount: Number(p.amount),
            })),
            total,
            page,
            limit
        );

        res.json(response);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
