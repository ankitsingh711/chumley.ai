import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import Logger from '../utils/logger';

const prisma = new PrismaClient();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2),
    departmentId: z.string().uuid().optional(),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const register = async (req: Request, res: Response) => {
    try {
        const validatedData = registerSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(validatedData.password, 10);

        const user = await prisma.user.create({
            data: {
                email: validatedData.email,
                password: hashedPassword,
                name: validatedData.name,
                ...(validatedData.departmentId && { departmentId: validatedData.departmentId }),
            },
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        Logger.info(`User registered: ${user.email}`);

        const { password, ...userWithoutPassword } = user;

        res.status(201).json({ user: userWithoutPassword, token });
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = loginSchema.parse(req.body);

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        Logger.info(`User logged in: ${user.email}`);

        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({ user: userWithoutPassword, token });
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const acceptInviteSchema = z.object({
    token: z.string(),
    name: z.string().min(2),
    password: z.string().min(6),
    jobTitle: z.string().optional(), // If we add jobTitle to User model later
});

export const acceptInvite = async (req: Request, res: Response) => {
    try {
        const { token, name, password } = acceptInviteSchema.parse(req.body);

        // Find user by invitation token
        const user = await prisma.user.findUnique({
            where: { invitationToken: token },
        });

        if (!user) {
            return res.status(404).json({ error: 'Invalid or expired invitation token' });
        }

        // Check expiration
        if (user.invitationExpires && user.invitationExpires < new Date()) {
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user: set password, name, status ACTIVE, clear token
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name,
                password: hashedPassword,
                status: 'ACTIVE',
                invitationToken: null,
                invitationExpires: null,
            },
        });

        // Generate JWT
        const jwtToken = jwt.sign(
            { id: updatedUser.id, email: updatedUser.email, name: updatedUser.name, role: updatedUser.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        Logger.info(`User accepted invite: ${updatedUser.email}`);

        const { password: _, ...userWithoutPassword } = updatedUser;

        res.json({ user: userWithoutPassword, token: jwtToken });
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Google OAuth callback handler
export const googleAuthCallback = async (req: Request, res: Response) => {
    try {
        // User is attached to req by Passport
        const user = req.user as any;

        if (!user) {
            return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '24h' }
        );

        Logger.info(`User logged in via Google: ${user.email}`);

        // Redirect to frontend with token
        res.redirect(`${process.env.FRONTEND_URL}/auth/google/callback?token=${token}`);
    } catch (error) {
        Logger.error(error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }
};
