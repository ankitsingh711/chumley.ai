import { Router } from 'express';
import * as departmentController from '../controllers/department.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all departments
router.get('/', departmentController.getAllDepartments);

// Get department by ID
router.get('/:id', departmentController.getDepartmentById);

// Update department (budget/description)
router.patch('/:id', departmentController.updateDepartment);

// Get department spending
router.get('/:id/spending', departmentController.getDepartmentSpending);

// Get spending by category
router.get('/:id/spending/categories', departmentController.getSpendingByCategory);

export default router;
