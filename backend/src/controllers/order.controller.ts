import { Request, Response } from 'express';
import { PrismaClient, OrderStatus, RequestStatus } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';
import budgetMonitorService from '../services/budget-monitor.service';

const prisma = new PrismaClient();

const createOrderSchema = z.object({
    requestId: z.string().uuid(),
    supplierId: z.string().uuid(),
});

const updateOrderSchema = z.object({
    status: z.nativeEnum(OrderStatus),
});

export const createOrder = async (req: Request, res: Response) => {
    try {
        const validatedData = createOrderSchema.parse(req.body);

        // Check if request exists and is approved
        const request = await prisma.purchaseRequest.findUnique({
            where: { id: validatedData.requestId },
            include: {
                requester: {
                    include: {
                        department: true,
                    },
                },
            },
        });

        if (!request) {
            return res.status(404).json({ error: 'Purchase Request not found' });
        }

        if (request.status !== RequestStatus.APPROVED) {
            return res.status(400).json({ error: 'Purchase Request must be APPROVED before creating an Order' });
        }

        // Check if order already exists for this request
        const existingOrder = await prisma.purchaseOrder.findUnique({
            where: { requestId: validatedData.requestId },
        });

        if (existingOrder) {
            return res.status(400).json({ error: 'Purchase Order already exists for this request' });
        }

        const order = await prisma.purchaseOrder.create({
            data: {
                requestId: validatedData.requestId,
                supplierId: validatedData.supplierId,
                totalAmount: request.totalAmount, // Inherit amount
                status: OrderStatus.IN_PROGRESS,
            },
        });

        Logger.info(`Purchase Order created: ${order.id} for Request ${request.id}`);

        // Log interaction
        await prisma.interactionLog.create({
            data: {
                supplierId: validatedData.supplierId,
                userId: request.requesterId, // Use requester ID as the context user, or could be approver
                eventType: 'order_created',
                title: 'Purchase Order Issued',
                description: `Order #${order.id.slice(0, 8)} issued for Request #${request.id.slice(0, 8)}. Amount: £${Number(order.totalAmount).toLocaleString()}`,
                eventDate: new Date(),
            }
        });

        // Check budget thresholds after order creation
        if (request.requester?.department) {
            const department = request.requester.department;
            budgetMonitorService.checkDepartmentThreshold(department.id, department.name)
                .catch(err => Logger.error('Failed to check budget threshold:', err));
        }

        res.status(201).json(order);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getOrders = async (req: Request, res: Response) => {
    try {
        const orders = await prisma.purchaseOrder.findMany({
            include: {
                supplier: { select: { name: true } },
                request: { select: { requester: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(orders);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getOrderById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const order = await prisma.purchaseOrder.findUnique({
            where: { id },
            include: {
                supplier: true,
                request: { include: { items: true } },
            },
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { status } = updateOrderSchema.parse(req.body);

        const currentOrder = await prisma.purchaseOrder.findUnique({ where: { id } });
        if (!currentOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const updateData: any = { status };

        // specific logic for SENT status (Issuing the PO)
        if (status === OrderStatus.SENT && !currentOrder.issuedAt) {
            updateData.issuedAt = new Date();
        }

        const order = await prisma.purchaseOrder.update({
            where: { id },
            data: updateData,
        });

        // Log interaction for status change
        await prisma.interactionLog.create({
            data: {
                supplierId: order.supplierId,
                userId: req.user?.id || 'system', // Ideally use authenticated user ID
                eventType: 'order_status_updated',
                title: `Order #${order.id.slice(0, 8)} Updated`,
                description: `Status changed from ${currentOrder.status} to ${status}`,
                eventDate: new Date(),
            }
        });

        Logger.info(`Order ${id} status updated to ${status}`);
        res.json(order);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
