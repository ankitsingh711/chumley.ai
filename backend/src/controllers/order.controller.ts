import { Request, Response } from 'express';
import { OrderStatus, RequestStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';
import budgetMonitorService from '../services/budget-monitor.service';
import prisma from '../config/db';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { CacheService } from '../utils/cache';


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
                userId: (req as any).user.id, // Use actual user who clicked create
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

        // Invalidate caches to ensure Dashboard and KPIs update immediately
        await CacheService.invalidateOrderCache();
        await CacheService.invalidateRequestCache(request.id);

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
        const user = req.user! as any;
        const { page, limit, skip } = getPaginationParams(req);

        // Build cache key
        const cacheKey = `orders:list:${user.id}:page${page}:limit${limit}`;

        // Try cache first
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Restrict view for MEMBER, MANAGER, and SENIOR_MANAGER (System Admin sees all)
        const isRestricted = [UserRole.MEMBER, UserRole.MANAGER, UserRole.SENIOR_MANAGER].includes(user.role);

        const where: any = {};
        if (isRestricted) {
            if (user.departmentId) {
                // Check if the request's requester is in the same department
                where.request = {
                    requester: {
                        departmentId: user.departmentId
                    }
                };
            } else {
                // If user has no department, they can only see orders from their own requests (fallback)
                where.request = {
                    requesterId: user.id
                };
            }
        }

        const [orders, total] = await Promise.all([
            prisma.purchaseOrder.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    requestId: true,
                    supplierId: true,
                    status: true,
                    totalAmount: true,
                    issuedAt: true,
                    createdAt: true,
                    updatedAt: true,
                    supplier: { select: { id: true, name: true, contactEmail: true } },
                    request: {
                        select: {
                            requester: { select: { id: true, name: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.purchaseOrder.count({ where })
        ]);

        // Transform to DTO
        const ordersDTO = orders.map(order => ({
            id: order.id,
            requestId: order.requestId,
            supplier: {
                id: order.supplierId,
                name: order.supplier.name,
                contactEmail: order.supplier.contactEmail,
            },
            requesterName: order.request.requester.name,
            status: order.status,
            totalAmount: Number(order.totalAmount),
            issuedAt: order.issuedAt,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        }));

        const response = createPaginatedResponse(ordersDTO, total, page, limit);

        // Cache for 5 minutes
        await CacheService.set(cacheKey, response, 300);

        res.json(response);
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
                userId: (req as any).user.id,
                eventType: 'order_status_updated',
                title: `Order #${order.id.slice(0, 8)} Updated`,
                description: `Status changed from ${currentOrder.status} to ${status}`,
                eventDate: new Date(),
            }
        });

        Logger.info(`Order ${id} status updated to ${status}`);

        // Invalidate cache
        await CacheService.invalidateOrderCache(id);

        res.json(order);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
