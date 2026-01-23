import { Router } from 'express';
import { createOrder, getOrders, getOrderById, updateOrderStatus } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getOrders);
router.get('/:id', getOrderById);

// Only Procurement folks (Admins/Managers) handle Orders
router.post('/', authorize([Role.ADMIN, Role.MANAGER]), createOrder);
router.patch('/:id/status', authorize([Role.ADMIN, Role.MANAGER]), updateOrderStatus);

export default router;
