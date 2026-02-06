import { Request, Response } from 'express';
import { PrismaClient, RequestStatus } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';

const prisma = new PrismaClient();

const createSupplierSchema = z.object({
    name: z.string().min(2),
    contactEmail: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    category: z.string().min(1),
    logoUrl: z.string().optional(),
});

const updateSupplierSchema = createSupplierSchema.partial();

export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                orders: {
                    select: {
                        status: true,
                        totalAmount: true,
                        createdAt: true,
                    }
                }
            }
        });

        const suppliersWithStats = suppliers.map(supplier => {
            const s = supplier as any;
            const activeOrders = s.orders ? s.orders.filter((o: any) =>
                o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
            ).length : 0;

            const totalSpend = s.orders ? s.orders.reduce((acc: number, curr: any) => {
                return curr.status !== 'CANCELLED' ? acc + Number(curr.totalAmount) : acc;
            }, 0) : 0;

            const lastOrderDate = supplier.orders.length > 0
                ? supplier.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
                : null;

            return {
                ...supplier,
                orders: undefined, // remove raw orders from list response
                stats: {
                    activeOrders,
                    totalSpend,
                },
                lastOrderDate,
            };
        });

        res.json(suppliersWithStats);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getSupplierById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                orders: true,
                requests: {
                    where: { status: { not: RequestStatus.IN_PROGRESS } },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            },
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        // Calculate detailed stats on the fly
        const s = supplier as any;
        const activeOrders = s.orders ? s.orders.filter((o: any) =>
            o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
        ).length : 0;

        const totalSpend = supplier.orders.reduce((acc, curr) => {
            return curr.status !== 'CANCELLED' ? acc + Number(curr.totalAmount) : acc;
        }, 0);

        res.json({
            ...supplier,
            stats: {
                activeOrders,
                totalSpend,
            }
        });
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const createSupplier = async (req: Request, res: Response) => {
    try {
        const validatedData = createSupplierSchema.parse(req.body);

        const supplier = await prisma.supplier.create({
            data: {
                ...validatedData,
                status: 'ACTIVE',
            },
        });

        Logger.info(`Supplier created: ${supplier.name}`);
        res.status(201).json(supplier);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = updateSupplierSchema.parse(req.body);

        const supplier = await prisma.supplier.update({
            where: { id },
            data: validatedData,
        });

        Logger.info(`Supplier updated: ${id}`);
        res.json(supplier);
    } catch (error: any) {
        Logger.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteSupplier = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        await prisma.supplier.delete({
            where: { id },
        });
        Logger.info(`Supplier deleted: ${id}`);
        res.status(204).send();
    } catch (error: any) {
        Logger.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get supplier with full details
export const getSupplierDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const supplier = await prisma.supplier.findUnique({
            where: { id },
            include: {
                details: true,
                orders: true,
                requests: {
                    where: { status: { not: RequestStatus.IN_PROGRESS } },
                    orderBy: { createdAt: 'desc' },
                    take: 20
                }
            },
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        const s = supplier as any;
        const activeOrders = s.orders ? s.orders.filter((o: any) =>
            o.status !== 'CANCELLED' && o.status !== 'COMPLETED'
        ).length : 0;

        const totalSpend = s.orders ? s.orders.reduce((acc: number, curr: any) => {
            return curr.status !== 'CANCELLED' ? acc + Number(curr.totalAmount) : acc;
        }, 0) : 0;

        res.json({
            ...supplier,
            stats: {
                activeOrders,
                totalSpend,
            }
        });
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Update supplier details
const updateSupplierDetailsSchema = z.object({
    name: z.string().min(2).optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    contactName: z.string().optional(),
    contactEmail: z.string().email().optional(),
    logoUrl: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    paymentTerms: z.string().optional(),
    paymentMethod: z.string().optional(),
    internalNotes: z.string().optional(),
});

export const updateSupplierDetails = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = updateSupplierDetailsSchema.parse(req.body);

        // Extract base supplier fields
        const { name, category, status, contactName, contactEmail, logoUrl, ...detailsFields } = validatedData;

        // Update supplier base fields
        const supplierUpdateData: any = {};
        if (name !== undefined) supplierUpdateData.name = name;
        if (category !== undefined) supplierUpdateData.category = category;
        if (status !== undefined) supplierUpdateData.status = status;
        if (contactName !== undefined) supplierUpdateData.contactName = contactName;
        if (contactEmail !== undefined) supplierUpdateData.contactEmail = contactEmail;
        if (logoUrl !== undefined) supplierUpdateData.logoUrl = logoUrl;

        const supplier = await prisma.supplier.update({
            where: { id },
            data: supplierUpdateData,
            include: { details: true }
        });

        // Update or create supplier details
        if (Object.keys(detailsFields).length > 0) {
            await prisma.supplierDetails.upsert({
                where: { supplierId: id },
                create: {
                    supplierId: id,
                    ...detailsFields,
                },
                update: detailsFields,
            });
        }

        // Fetch updated data
        const updatedSupplier = await prisma.supplier.findUnique({
            where: { id },
            include: { details: true }
        });

        Logger.info(`Supplier details updated: ${id}`);
        res.json(updatedSupplier);
    } catch (error: any) {
        Logger.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get supplier messages
export const getSupplierMessages = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        const messages = await prisma.message.findMany({
            where: { supplierId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json(messages);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Send supplier message
const sendMessageSchema = z.object({
    subject: z.string().optional(),
    content: z.string().min(1),
    isFromUser: z.boolean().default(true),
});

export const sendSupplierMessage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = sendMessageSchema.parse(req.body);
        const userId = req.user!.id;

        const message = await prisma.message.create({
            data: {
                supplierId: id,
                userId,
                ...validatedData,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });

        Logger.info(`Message sent to supplier ${id} by user ${userId}`);
        res.status(201).json(message);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Get supplier interactions
export const getSupplierInteractions = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        const interactions = await prisma.interactionLog.findMany({
            where: { supplierId: id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: { eventDate: 'desc' }
        });

        res.json(interactions);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Create supplier interaction
const createInteractionSchema = z.object({
    eventType: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    eventDate: z.string().datetime(),
});

export const createSupplierInteraction = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = createInteractionSchema.parse(req.body);
        const userId = req.user!.id;

        const interaction = await prisma.interactionLog.create({
            data: {
                supplierId: id,
                userId,
                eventType: validatedData.eventType,
                title: validatedData.title,
                description: validatedData.description,
                eventDate: new Date(validatedData.eventDate),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });

        Logger.info(`Interaction logged for supplier ${id} by user ${userId}`);
        res.status(201).json(interaction);
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

