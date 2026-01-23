import { Request, Response } from 'express';
import { PrismaClient, RequestStatus, Role } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';

const prisma = new PrismaClient();

const itemSchema = z.object({
    description: z.string().min(3),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
});

const createRequestSchema = z.object({
    reason: z.string().optional(),
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
                status: RequestStatus.PENDING, // Auto-submit for now
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
            },
        });

        Logger.info(`Purchase Request created: ${request.id} by ${requesterId}`);
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
        const user = req.user!;
        const where: any = {};

        // Requesters can only see their own requests
        if (user.role === Role.REQUESTER) {
            where.requesterId = user.id;
        }

        const requests = await prisma.purchaseRequest.findMany({
            where,
            include: {
                requester: {
                    select: { id: true, name: true, email: true, department: true },
                },
                items: true,
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
            },
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Authorization check
        if (user.role === Role.REQUESTER && request.requesterId !== user.id) {
            return res.status(403).json({ error: 'Forbidden' });
        }

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
        res.json(updatedRequest);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
