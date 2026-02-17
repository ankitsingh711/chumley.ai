import { Request, Response } from 'express';
import { RequestStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';
import { sendNotification } from '../utils/websocket';
import { sendPurchaseRequestNotification, sendRejectionNotification } from '../services/email.service';
import approvalService from '../services/approval.service';
import prisma from '../config/db';
import { getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { CacheService } from '../utils/cache';


const itemSchema = z.object({
    description: z.string().min(3),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
});

const createRequestSchema = z.object({
    reason: z.string().optional(),
    supplierId: z.string().uuid().optional(),
    budgetCategory: z.string().optional(), // Used as Department Name (Legacy)
    categoryId: z.string().uuid().optional(), // Hierarchical Category ID
    deliveryLocation: z.string().optional(),
    expectedDeliveryDate: z.string().transform((str) => new Date(str)).optional(),
    items: z.array(itemSchema).min(1),
});

const updateStatusSchema = z.object({
    status: z.nativeEnum(RequestStatus),
});

export const createRequest = async (req: Request, res: Response) => {
    try {
        const validatedData = createRequestSchema.parse(req.body);
        const requesterId = req.user!.id; // Authenticated user
        const userRole = req.user!.role;

        // Enforce Spending Category for non-MEMBER roles (Manager, Senior Manager, Admin)
        if (userRole !== UserRole.MEMBER && !validatedData.categoryId) {
            return res.status(400).json({ error: 'Spending Category is required for your role' });
        }

        // Calculate total amount
        const totalAmount = validatedData.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
        );

        const request = await prisma.purchaseRequest.create({
            data: {
                requesterId,
                reason: validatedData.reason,
                totalAmount,
                status: RequestStatus.PENDING, // Start as PENDING (Plan: 4a)
                // New fields
                supplierId: validatedData.supplierId,
                budgetCategory: validatedData.budgetCategory,
                categoryId: validatedData.categoryId,
                deliveryLocation: validatedData.deliveryLocation,
                expectedDeliveryDate: validatedData.expectedDeliveryDate,
                items: {
                    create: validatedData.items.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.quantity * item.unitPrice,
                    })),
                },
            },
            include: {
                items: true,
                supplier: true,
                requester: { include: { department: true } } // Include for routing
            },
        });

        Logger.info(`Purchase Request created: ${request.id} by ${requesterId}`);

        // Route to approver (Plan: 4a)
        await approvalService.routeRequest(request.id);

        // Invalidate cache
        await CacheService.invalidateRequestCache();

        res.status(201).json(request);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getRequests = async (req: Request, res: Response) => {
    try {
        const user = req.user! as any;
        const { page, limit, skip } = getPaginationParams(req);

        // Build cache key
        const cacheKey = `requests:list:${user.id}:page${page}:limit${limit}`;

        // Try cache  first
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        // Restrict view for MEMBER, MANAGER, and SENIOR_MANAGER (System Admin sees all)
        const isRestricted = [UserRole.MEMBER, UserRole.MANAGER, UserRole.SENIOR_MANAGER].includes(user.role);

        const where: any = {};
        if (isRestricted) {
            if (user.role === UserRole.MEMBER) {
                // Members see only their own requests
                where.requesterId = user.id;
            } else if (user.departmentId) {
                // Managers and Senior Managers see all requests in their department
                where.requester = { departmentId: user.departmentId };
            } else {
                // Fallback for managers without department
                where.requesterId = user.id;
            }
        }

        // Get total count and paginated data in parallel
        const [requests, total] = await Promise.all([
            prisma.purchaseRequest.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    requesterId: true,
                    status: true,
                    totalAmount: true,
                    reason: true,
                    createdAt: true,
                    updatedAt: true,
                    requester: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            department: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    supplierId: true, // Add this
                    supplier: {
                        select: {
                            id: true,
                            name: true,
                            contactName: true,
                            contactEmail: true,
                            logoUrl: true
                        }
                    },
                    items: {
                        select: {
                            id: true,
                            description: true,
                            quantity: true,
                            unitPrice: true,
                            totalPrice: true
                        }
                    },
                    order: {
                        select: {
                            id: true,
                            status: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.purchaseRequest.count({ where })
        ]);

        // Transform to lean DTO
        const requestsDTO = requests.map(req => ({
            id: req.id,
            requesterId: req.requesterId,
            requester: {
                id: req.requester.id,
                name: req.requester.name,
                email: req.requester.email,
                department: req.requester.department
            },
            supplierId: req.supplierId, // Add this
            status: req.status,
            totalAmount: Number(req.totalAmount),
            reason: req.reason,
            createdAt: req.createdAt,
            updatedAt: req.updatedAt,
            items: req.items.map(item => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                totalPrice: Number(item.totalPrice)
            })),
            supplier: req.supplier,
            order: req.order
        }));

        const response = createPaginatedResponse(requestsDTO, total, page, limit);

        // Cache for 2 minutes
        await CacheService.set(cacheKey, response, 120);

        res.json(response);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getRequestById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = req.user!;

        const request = await prisma.purchaseRequest.findUnique({
            where: { id },
            include: {
                requester: { select: { id: true, name: true } },
                items: true,
                approver: { select: { id: true, name: true } },
                supplier: true,
            },
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        res.json(request);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

import { OrderStatus } from '@prisma/client';

export const updateRequestStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { status } = updateStatusSchema.parse(req.body);
        const approverId = req.user!.id;

        const request = await prisma.purchaseRequest.findUnique({
            where: { id },
            include: { items: true, supplier: true, requester: true, order: true }
        });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Permission Check
        Logger.info(`updateRequestStatus: User ${req.user?.id} updating request ${id} to ${status}`);

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.user.id;
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, departmentId: true }
        });

        if (!currentUser) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (currentUser.role !== UserRole.SYSTEM_ADMIN) {
            // Must be MANAGER or SENIOR_MANAGER
            if (currentUser.role !== UserRole.MANAGER && currentUser.role !== UserRole.SENIOR_MANAGER) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            // Must be in same department as requester
            if (!currentUser.departmentId || currentUser.departmentId !== request.requester.departmentId) {
                Logger.warn(`Permission Denied: User ${userId} Dept: ${currentUser.departmentId}, Requester Dept: ${request.requester.departmentId}`);
                return res.status(403).json({ error: 'You can only approve requests from your own department' });
            }
        }

        const updatedRequest = await prisma.purchaseRequest.update({
            where: { id },
            data: {
                status,
                approverId,
            },
        });

        Logger.info(`Request ${id} status updated to ${status} by ${approverId}`);

        if (status === RequestStatus.APPROVED) {
            // Plan 4b: Generate PO
            if (request.supplierId) {
                // Check if PO already exists
                if (request.order) {
                    Logger.info(`PO already exists for Request ${id}: ${request.order.id}. Skipping creation.`);
                } else {
                    const po = await prisma.purchaseOrder.create({
                        data: {
                            requestId: id,
                            supplierId: request.supplierId,
                            totalAmount: request.totalAmount,
                            status: OrderStatus.SENT, // Assuming we send it immediately via email below
                        }
                    });
                    Logger.info(`Generated PO ${po.id} for Request ${id}`);
                }

                if (request.supplier && request.supplier.contactEmail) {
                    Logger.info(`Sending email to supplier ${request.supplier.name} (${request.supplier.contactEmail})`);

                    // Send email to supplier (non-blocking, fire-and-forget)
                    sendPurchaseRequestNotification({
                        supplierEmail: request.supplier.contactEmail,
                        supplierName: request.supplier.name,
                        requesterName: request.requester?.name || 'Unknown',
                        requesterEmail: request.requester?.email || '',
                        requestId: request.id,
                        items: request.items.map(item => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: Number(item.unitPrice)
                        })),
                        totalAmount: Number(request.totalAmount),
                        createdAt: request.createdAt,
                        reason: request.reason || undefined,
                    }).then((emailResult) => {
                        if (emailResult) {
                            Logger.info(`Successfully sent email to ${request.supplier?.contactEmail}`);
                        } else {
                            Logger.warn(`Failed to send email to ${request.supplier?.contactEmail} (service returned false)`);
                        }
                    }).catch((err) => {
                        Logger.error(`Error sending email to supplier:`, err);
                    });
                } else {
                    Logger.warn(`Cannot send email: Supplier missing or has no email. SupplierId: ${request.supplierId}, Email: ${request.supplier?.contactEmail}`);
                }
            }
        }

        if (status === RequestStatus.REJECTED) {
            // Plan 4c: Email requester
            if (request.requester && request.requester.email) {
                sendRejectionNotification({
                    requesterEmail: request.requester.email,
                    requesterName: request.requester.name,
                    requestId: request.id,
                    totalAmount: Number(request.totalAmount),
                    // We don't have rejection reason in body yet
                }).catch(err => Logger.error('Failed to email requester about rejection', err));
            }
        }

        // Notify requester about status change
        const notificationType = status === RequestStatus.APPROVED ? 'request_approved' : 'request_rejected';
        const notificationTitle = status === RequestStatus.APPROVED ? 'Request Approved' : 'Request Rejected';
        const notificationMessage = `Your purchase request #${id.slice(0, 8)} has been ${status.toLowerCase()} by ${req.user!.name}`;

        sendNotification(request.requesterId, {
            id: `notif-${Date.now()}-${Math.random()}`,
            type: notificationType,
            title: notificationTitle,
            message: notificationMessage,
            userId: request.requesterId,
            createdAt: new Date(),
            read: false,
            metadata: { requestId: id, status },
        });

        // Invalidate cache
        await CacheService.invalidateRequestCache();

        res.json(updatedRequest);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
export const deleteRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        const request = await prisma.purchaseRequest.findUnique({ where: { id } });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.status !== RequestStatus.IN_PROGRESS) {
            return res.status(400).json({ error: 'Only in-progress requests can be deleted' });
        }

        await prisma.purchaseRequest.delete({ where: { id } });

        // Invalidate cache
        await CacheService.invalidateRequestCache();

        Logger.info(`Request ${id} deleted by ${req.user!.id}`);
        res.status(204).send();
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const addAttachment = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { filename, fileUrl, fileSize, mimeType } = req.body;

        const request = await prisma.purchaseRequest.findUnique({ where: { id } });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const attachment = await prisma.attachment.create({
            data: {
                requestId: id,
                filename,
                fileUrl,
                fileSize,
                mimeType,
            },
        });

        // Log interaction only if supplier is involved
        if (request.supplierId) {
            await prisma.interactionLog.create({
                data: {
                    supplierId: request.supplierId,
                    userId: req.user!.id,
                    eventType: 'document_uploaded',
                    title: 'Document Uploaded',
                    description: `Document "${filename}" attached to Request #${request.id.slice(0, 8)}`,
                    eventDate: new Date(),
                }
            });
        }

        // Let's just create attachment and return it.
        // We can add audit log if needed.

        res.status(201).json(attachment);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
