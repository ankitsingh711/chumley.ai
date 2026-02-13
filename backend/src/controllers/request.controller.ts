import { Request, Response } from 'express';
import { PrismaClient, RequestStatus, UserRole } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';
import { sendNotification } from '../utils/websocket';
import { sendPurchaseRequestNotification, sendRejectionNotification } from '../services/email.service';
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
        // Restrict view for MEMBER, MANAGER, and SENIOR_MANAGER (System Admin sees all)
        const isRestricted = [UserRole.MEMBER, UserRole.MANAGER, UserRole.SENIOR_MANAGER].includes(user.role);

        const where: any = {};
        if (isRestricted) {
            // Plan 6c: Dept users see only own dept data
            // But wait, Plan 2c says "Department users see only their department vendors"
            // Plan 6b: Senior Manager view department-specific data
            // Plan 5: Dashboard updates implies viewing requests based on role.

            // Existing logic:
            if (isRestricted) {
                // Plan 6c: Dept users see only own requests usually
                // Plan 6b: Senior Manager view department-specific data

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
        }

        const requests = await prisma.purchaseRequest.findMany({
            where,
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
            include: { items: true, supplier: true, requester: true }
        });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Validate state transition?
        // e.g. can only approve/reject PENDING requests

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
                const po = await prisma.purchaseOrder.create({
                    data: {
                        requestId: id,
                        supplierId: request.supplierId,
                        totalAmount: request.totalAmount,
                        status: OrderStatus.SENT, // Assuming we send it immediately via email below
                    }
                });
                Logger.info(`Generated PO ${po.id} for Request ${id}`);

                if (request.supplier && request.supplier.contactEmail) {
                    Logger.info(`Sending email to supplier ${request.supplier.name} (${request.supplier.contactEmail})`);
                    try {
                        const emailResult = await sendPurchaseRequestNotification({
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
                        });

                        if (emailResult) {
                            Logger.info(`Successfully sent email to ${request.supplier.contactEmail}`);
                        } else {
                            Logger.warn(`Failed to send email to ${request.supplier.contactEmail} (service returned false)`);
                        }
                    } catch (err) {
                        Logger.error(`Error calling email service: ${err}`);
                    }
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
