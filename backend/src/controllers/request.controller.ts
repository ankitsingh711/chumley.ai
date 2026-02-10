import { Request, Response } from 'express';
import { PrismaClient, RequestStatus } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';
import { sendNotification } from '../utils/websocket';
import { sendPurchaseRequestNotification } from '../services/email.service';
import approvalService from '../services/approval.service';

const prisma = new PrismaClient();

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
                status: RequestStatus.IN_PROGRESS, // Start as in progress
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
            },
        });

        Logger.info(`Purchase Request created: ${request.id} by ${requesterId}`);

        // Notify all users about new request (no role-based filtering)
        const allUsers = await prisma.user.findMany({
            where: {
                id: { not: requesterId }, // Don't notify the creator
            },
        });

        allUsers.forEach((otherUser) => {
            sendNotification(otherUser.id, {
                id: `notif-${Date.now()}-${Math.random()}`,
                type: 'request_created',
                title: 'New Purchase Request',
                message: `${req.user!.name} created a new purchase request for $${totalAmount.toLocaleString()}`,
                userId: otherUser.id,
                createdAt: new Date(),
                read: false,
                metadata: { requestId: request.id },
            });
        });

        // Send email notification to supplier if available
        if (request.supplier && request.supplier.contactEmail) {
            // Send email asynchronously, don't block the response
            sendPurchaseRequestNotification({
                supplierEmail: request.supplier.contactEmail,
                supplierName: request.supplier.name,
                requesterName: req.user!.name,
                requesterEmail: req.user!.email,
                requestId: request.id,
                items: validatedData.items,
                totalAmount,
                createdAt: request.createdAt,
                reason: validatedData.reason,
            }).catch((error) => {
                // Log error but don't fail the request creation
                Logger.error(`Failed to send email to supplier ${request.supplier!.name}:`, error);
            });
        }

        // Log interaction if supplier is involved
        if (request.supplierId) {
            await prisma.interactionLog.create({
                data: {
                    supplierId: request.supplierId,
                    userId: requesterId,
                    eventType: 'request_created',
                    title: 'Purchase Request Created',
                    description: `Request #${request.id.slice(0, 8)} created for ${validatedData.items.length} items. Total: $${totalAmount.toLocaleString()}`,
                    eventDate: new Date(),
                }
            });
        }

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
        // All users can see all requests
        const requests = await prisma.purchaseRequest.findMany({
            include: {
                requester: {
                    select: { id: true, name: true, email: true, department: true },
                },
                items: true,
                supplier: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(requests);
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

        // All users can view all requests

        res.json(request);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateRequestStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { status } = updateStatusSchema.parse(req.body);
        const approverId = req.user!.id;

        const request = await prisma.purchaseRequest.findUnique({ where: { id } });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const updatedRequest = await prisma.purchaseRequest.update({
            where: { id },
            data: {
                status,
                approverId,
            },
        });

        Logger.info(`Request ${id} status updated to ${status} by ${approverId}`);

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
