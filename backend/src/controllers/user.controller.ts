import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    departmentId: z.string().optional(),
});

export const getUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                department: true,
                createdAt: true,
            },
        });
        res.json(users);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                department: true,
                createdAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const validatedData = updateUserSchema.parse(req.body);

        const user = await prisma.user.update({
            where: { id },
            data: validatedData,
            select: {
                id: true,
                email: true,
                name: true,
                department: true,
            },
        });

        Logger.info(`User updated: ${user.email}`);
        res.json(user);
    } catch (error: any) {
        Logger.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        await prisma.user.delete({
            where: { id },
        });
        Logger.info(`User deleted: ${id}`);
        res.status(204).send();
    } catch (error: any) {
        Logger.error(error);
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const inviteUserSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role: z.enum(['SYSTEM_ADMIN', 'SENIOR_MANAGER', 'MANAGER', 'MEMBER']).optional(),
    departmentId: z.string().optional(),
});

export const inviteUser = async (req: Request, res: Response) => {
    try {
        const validatedData = inviteUserSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }


        // Generate invitation token
        // In a real app, use crypto.randomBytes
        const invitationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const invitationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Create user with PENDING status and NO valid password initially (or a random unusable one)
        const user = await prisma.user.create({
            data: {
                email: validatedData.email,
                name: validatedData.name,
                password: await bcrypt.hash(Math.random().toString(36), 10), // Unusable password
                role: validatedData.role || 'MEMBER',
                departmentId: validatedData.departmentId,
                status: 'PENDING',
                invitationToken,
                invitationExpires,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                department: true,
                createdAt: true,
            },
        });

        Logger.info(`User invited: ${user.email}`);

        // Construct invitation link
        const inviteLink = `${process.env.FRONTEND_URL}/onboarding?token=${invitationToken}`;

        res.status(201).json({
            message: 'User invited successfully',
            user,
            inviteLink
        });
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
