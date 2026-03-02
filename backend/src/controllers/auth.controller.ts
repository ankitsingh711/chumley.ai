import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import Logger from '../utils/logger';
import prisma from '../config/db';
import { getFrontendUrl } from '../config/runtime';


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

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return secret;
};

const setAuthCookie = (res: Response, token: string) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('authToken', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax', // 'none' required for cross-domain in production, 'lax' for localhost
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/'
    });
};

export const register = async (req: Request, res: Response) => {
    try {
        if (process.env.ALLOW_PUBLIC_REGISTRATION !== 'true') {
            return res.status(403).json({ error: 'Public registration is disabled' });
        }

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
            include: { department: true }
        });

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                departmentId: user.departmentId
            },
            getJwtSecret(),
            { expiresIn: '24h', algorithm: 'HS256' }
        );

        Logger.info(`User registered: ${user.email}`);

        const { password, ...userWithoutPassword } = user;

        setAuthCookie(res, token);
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
            include: { department: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (user.status !== 'ACTIVE') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                departmentId: user.departmentId
            },
            getJwtSecret(),
            { expiresIn: '24h', algorithm: 'HS256' }
        );

        Logger.info(`User logged in: ${user.email}`);

        const { password: _, ...userWithoutPassword } = user;

        setAuthCookie(res, token);
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
    jobTitle: z.string().optional(),
});

export const acceptInvite = async (req: Request, res: Response) => {
    try {
        const { token, name, password } = acceptInviteSchema.parse(req.body);
        const normalizedToken = token.trim();

        const user = await prisma.user.findUnique({
            where: { invitationToken: normalizedToken },
            include: { department: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'Invalid or expired invitation token' });
        }

        if (user.invitationExpires && user.invitationExpires < new Date()) {
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                name,
                password: hashedPassword,
                status: 'ACTIVE',
                invitationToken: null,
                invitationExpires: null,
            },
            include: { department: true }
        });

        const jwtToken = jwt.sign(
            {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
                departmentId: updatedUser.departmentId
            },
            getJwtSecret(),
            { expiresIn: '24h', algorithm: 'HS256' }
        );

        Logger.info(`User accepted invite: ${updatedUser.email}`);

        const { password: _, ...userWithoutPassword } = updatedUser;

        setAuthCookie(res, jwtToken);
        res.json({ user: userWithoutPassword, token: jwtToken });
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const logout = async (req: Request, res: Response) => {
    const isProduction = process.env.NODE_ENV === 'production';
    res.clearCookie('authToken', {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        path: '/'
    });
    res.status(200).json({ message: 'Logged out successfully' });
};

export const getMe = async (req: Request, res: Response) => {
    try {
        // req.user is populated by auth middleware
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { department: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { password, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const googleAuthCallback = async (req: Request, res: Response) => {
    try {
        const frontendUrl = getFrontendUrl();
        const user = req.user as any;

        if (!user) {
            return res.redirect(`${frontendUrl}/login?error=auth_failed`);
        }

        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                departmentId: user.departmentId
            },
            getJwtSecret(),
            { expiresIn: '24h', algorithm: 'HS256' }
        );

        Logger.info(`User logged in via Google: ${user.email}`);

        setAuthCookie(res, token);
        // Redirect to frontend with token in query params for Safari compatibility
        res.redirect(`${frontendUrl}/auth/google/callback?token=${encodeURIComponent(token)}`);
    } catch (error) {
        Logger.error(error);
        res.redirect(`${getFrontendUrl()}/login?error=auth_failed`);
    }
};
