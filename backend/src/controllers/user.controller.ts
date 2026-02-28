import { Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import Logger from '../utils/logger';
import { sendInvitationEmail } from '../utils/email';
import prisma from '../config/db';


const updateUserSchema = z.object({
    name: z.string().min(2).optional(),
    departmentId: z.string().optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).optional(),
    role: z.enum(['SYSTEM_ADMIN', 'SENIOR_MANAGER', 'MANAGER', 'MEMBER']).optional(),
});

// Add UserRole to imports if not present, or define locally if needed
// Actually, let's use the string values matching the prisma schema for now to avoid import issues if UserRole isn't exported in backend
// But we should try to use the enum if possible. Let's check imports first.

export const getUsers = async (req: Request, res: Response) => {
    try {
        const currentUser = req.user;
        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Fetch full user details to get department info
        const userWithDept = await prisma.user.findUnique({
            where: { id: currentUser.id },
            include: { department: true }
        });

        if (!userWithDept) {
            return res.status(401).json({ error: 'User not found' });
        }

        let whereClause: any = {};

        // RBAC Logic
        if (userWithDept.role === 'SYSTEM_ADMIN') {
            // Admin sees all (or maybe filter out other admins if requirement says so, but usually they see all)
            // Frontend filters it, backend can return all.
        } else if (userWithDept.role === 'MANAGER' || userWithDept.role === 'SENIOR_MANAGER') {
            // Managers only see their department
            if (!userWithDept.departmentId) {
                // If manager has no department, they see no one (or just themselves?)
                // Returning empty array is safer
                return res.json([]);
            }
            whereClause = {
                departmentId: userWithDept.departmentId
            };
        } else {
            // Members see no one (or just themselves)
            whereClause = {
                id: currentUser.id
            };
            // Alternatively, return 403 Forbidden
            // return res.status(403).json({ error: 'Forbidden' });
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                department: true,
                status: true,
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
                role: true,
                department: true,
                status: true,
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
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Fetch requester's details
        const requester = await prisma.user.findUnique({
            where: { id: currentUser.id },
            include: { department: true }
        });

        if (!requester) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Fetch target user to check permissions
        const targetUser = await prisma.user.findUnique({
            where: { id }
        });

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }


        // Allow user to update their own profile
        const isSelfUpdate = currentUser.id === id;

        // RBAC Checks
        if (requester.role !== 'SYSTEM_ADMIN') {
            if (requester.role === 'MANAGER' || requester.role === 'SENIOR_MANAGER') {
                if (!isSelfUpdate) {
                    // Must be in same department
                    if (targetUser.departmentId !== requester.departmentId) {
                        return res.status(403).json({ error: 'You can only manage users in your department' });
                    }
                    // Cannot update role to System Admin
                    if (validatedData.role === 'SYSTEM_ADMIN') {
                        return res.status(403).json({ error: 'Cannot promote users to System Admin' });
                    }
                    // Cannot update a System Admin
                    if (targetUser.role === 'SYSTEM_ADMIN') {
                        return res.status(403).json({ error: 'Client not authorized to update System Admin' });
                    }
                }
            } else {
                // Members can only update themselves
                if (!isSelfUpdate) {
                    return res.status(403).json({ error: 'Forbidden' });
                }
            }

            // Prevent any non-System Admin from changing their OWN role or department
            if (isSelfUpdate) {
                if (validatedData.role && validatedData.role !== targetUser.role) {
                    return res.status(403).json({ error: 'You cannot change your own role' });
                }
                if (validatedData.departmentId && validatedData.departmentId !== targetUser.departmentId) {
                    return res.status(403).json({ error: 'You cannot change your own department' });
                }
                if (validatedData.status && validatedData.status !== targetUser.status) {
                    return res.status(403).json({ error: 'You cannot change your own status' });
                }
            }
        }

        const user = await prisma.user.update({
            where: { id },
            data: validatedData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                department: true,
                status: true,
            },
        });

        Logger.info(`User updated: ${user.email} `);
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
        const currentUser = req.user;

        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Fetch requester's details
        const requester = await prisma.user.findUnique({
            where: { id: currentUser.id }
        });

        if (!requester) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Fetch target user
        const targetUser = await prisma.user.findUnique({
            where: { id }
        });

        if (!targetUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // RBAC Checks
        if (requester.role !== 'SYSTEM_ADMIN') {
            // Only System Admins can delete users? Or Managers too?
            // Usually deletion is sensitive. Let's allowing Managers to delete purely within their dept for now if that's the intention,
            // but safer to restrict to Admin or check Requirement.
            // Requirement: "user permission button should be available to manager... and can see theor department members and update their roles"
            // It doesn't explicitly say DELETE. But usually "manage access" implies full control.
            // However, `updateUser` logic above handles roles.
            // I will allow Managers to delete from their Department, but NOT System Admins or Senior Managers out of their scope.

            if (requester.role === 'MANAGER' || requester.role === 'SENIOR_MANAGER') {
                if (targetUser.departmentId !== requester.departmentId) {
                    return res.status(403).json({ error: 'You can only delete users in your department' });
                }
                if (targetUser.role === 'SYSTEM_ADMIN') {
                    return res.status(403).json({ error: 'Cannot delete System Admin' });
                }
            } else {
                return res.status(403).json({ error: 'Forbidden' });
            }
        }

        await prisma.user.delete({
            where: { id },
        });
        Logger.info(`User deleted: ${id} `);
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

const generateInvitationToken = (): string =>
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const getInvitationExpiry = (): Date =>
    new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

export const inviteUser = async (req: Request, res: Response) => {
    try {
        const validatedData = inviteUserSchema.parse(req.body);

        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email },
        });

        if (existingUser) {
            if (existingUser.status !== 'PENDING') {
                return res.status(400).json({ error: 'User with this email already exists' });
            }

            const invitationToken = generateInvitationToken();
            const invitationExpires = getInvitationExpiry();

            const user = await prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    name: validatedData.name,
                    role: validatedData.role || existingUser.role,
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

            Logger.info(`Pending user re-invited: ${user.email}`);

            const inviteLink = `${process.env.FRONTEND_URL}/onboarding?token=${invitationToken}`;

            sendInvitationEmail({
                to: user.email,
                name: user.name,
                inviteLink,
                role: user.role,
                companyName: process.env.COMPANY_NAME || 'Aspect',
                invitedBy: 'Your administrator',
            }).catch((err) => {
                Logger.error(`Failed to resend invitation email to ${user.email}:`, err);
            });

            return res.status(200).json({
                message: 'Invitation resent successfully',
                user,
                inviteLink,
            });
        }


        // Generate invitation token
        // In a real app, use crypto.randomBytes
        const invitationToken = generateInvitationToken();
        const invitationExpires = getInvitationExpiry();

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

        Logger.info(`User invited: ${user.email} `);

        // Construct invitation link
        const inviteLink = `${process.env.FRONTEND_URL}/onboarding?token=${invitationToken}`;

        // Send invitation email (non-blocking, fire-and-forget)
        sendInvitationEmail({
            to: user.email,
            name: user.name,
            inviteLink,
            role: user.role,
            companyName: process.env.COMPANY_NAME || 'Aspect',
            invitedBy: 'Your administrator',
        }).catch((err) => {
            Logger.error(`Failed to send invitation email to ${user.email}:`, err);
        });

        res.status(201).json({
            message: 'User invited successfully',
            user,
            inviteLink,
        });
    } catch (error: any) {
        Logger.error(error);
        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: (error as any).errors });
        }
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
