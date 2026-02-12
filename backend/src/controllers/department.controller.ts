import { Request, Response } from 'express';
import departmentService from '../services/department.service';
import Logger from '../utils/logger';

/**
 * Get all departments
 */
export const getAllDepartments = async (req: Request, res: Response) => {
    try {
        const user = req.user as any;
        const departments = await departmentService.getAllDepartments(user);
        res.json(departments);
    } catch (error) {
        Logger.error(error);
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
