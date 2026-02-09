import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get category tree (must be before /:id to avoid route conflicts)
router.get('/tree', categoryController.getCategoryTree);

// Get categories by department
router.get('/department/:departmentId', categoryController.getCategoriesByDepartment);

// Get category path (breadcrumb)
router.get('/:id/path', categoryController.getCategoryPath);

// Get all categories
router.get('/', categoryController.getAllCategories);

// Get specific category
router.get('/:id', categoryController.getCategoryById);

// Create category
router.post('/', categoryController.createCategory);

// Update category
router.put('/:id', categoryController.updateCategory);

// Delete category
router.delete('/:id', categoryController.deleteCategory);

export default router;
