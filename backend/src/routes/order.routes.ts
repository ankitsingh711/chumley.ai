import { Router } from 'express';
import { createOrder, getOrders, getOrderById, updateOrderStatus } from '../controllers/order.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getOrders);
router.get('/:id', getOrderById);

// Only approval-capable roles can create/update orders
router.post('/', authorize(['SYSTEM_ADMIN', 'SENIOR_MANAGER', 'MANAGER']), createOrder);
router.patch('/:id/status', authorize(['SYSTEM_ADMIN', 'SENIOR_MANAGER', 'MANAGER']), updateOrderStatus);

export default router;
