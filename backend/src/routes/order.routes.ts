import { Router } from 'express';
import { createOrder, getOrders, getOrderById, updateOrderStatus } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getOrders);
router.get('/:id', getOrderById);

// All authenticated users can handle orders
router.post('/', createOrder);
router.patch('/:id/status', updateOrderStatus);

export default router;
