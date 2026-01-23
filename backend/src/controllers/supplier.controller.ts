import { Request, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';

const prisma = new PrismaClient();

const createSupplierSchema = z.object({
    name: z.string().min(2),
    contactEmail: z.string().email(),
    phone: z.string().optional(),
    address: z.string().optional(),
    category: z.string().min(1),
});

const updateSupplierSchema = createSupplierSchema.partial();

export const getSuppliers = async (req: Request, res: Response) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(suppliers);
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
            },
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        res.json(supplier);
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
