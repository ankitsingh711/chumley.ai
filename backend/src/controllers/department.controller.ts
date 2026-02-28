import { Request, Response } from 'express';
import { z } from 'zod';
import departmentService from '../services/department.service';
import Logger from '../utils/logger';

const updateDepartmentSchema = z.object({
    budget: z.number().finite().min(0).max(999999999999.99).optional(),
    description: z.string().trim().max(255).nullable().optional()
}).refine(
    (data) => data.budget !== undefined || Object.prototype.hasOwnProperty.call(data, 'description'),
    { message: 'At least one updatable field is required' }
);

/**
 * Get all departments
 */
export const getAllDepartments = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        Logger.info(`Fetching departments for user: ${user?.id} (${user?.email}, Role: ${user?.role})`);

        const departments = await departmentService.getAllDepartments(user);
        Logger.info(`Found ${departments.length} departments for user ${user?.email}`);

        res.json(departments);
    } catch (error) {
        Logger.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
};

/**
 * Get department by ID with details
 */
export const getDepartmentById = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const department = await departmentService.getDepartmentTree(id);

        if (!department) {
            return res.status(404).json({ error: 'Department not found' });
        }

        res.json(department);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Failed to fetch department' });
    }
};

/**
 * Get department spending
 */
export const getDepartmentSpending = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;

        const dateRange = startDate && endDate ? {
            startDate: new Date(startDate),
            endDate: new Date(endDate)
        } : undefined;

        const spending = await departmentService.getDepartmentSpending(id, dateRange);
        res.json(spending);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Failed to fetch department spending' });
    }
};

/**
 * Get spending by category for a department
 */
export const getSpendingByCategory = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const spending = await departmentService.getSpendingByCategory(id);
        res.json(spending);
    } catch (error) {
        Logger.error(error);
        res.status(500).json({ error: 'Failed to fetch category spending' });
    }
};

/**
 * Update department fields (budget/description)
 */
export const updateDepartment = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        const currentUser = req.user as any;

        if (!currentUser) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const payload = updateDepartmentSchema.parse(req.body);

        const updated = await departmentService.updateDepartment(id, payload, {
            role: currentUser.role,
            departmentId: currentUser.departmentId
        });

        if (!updated) {
            return res.status(404).json({ error: 'Department not found' });
        }

        res.json(updated);
    } catch (error: any) {
        Logger.error(error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({ error: error.issues });
        }

        if (error?.message === 'FORBIDDEN') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        res.status(500).json({ error: 'Failed to update department' });
    }
};
