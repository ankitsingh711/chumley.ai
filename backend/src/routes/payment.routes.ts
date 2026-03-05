import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
    getPaymentsByOrder,
    markInstallmentPaid,
    getOverduePayments,
} from '../controllers/payment.controller';

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// List installments for a specific order
router.get('/orders/:orderId/payments', getPaymentsByOrder);

// Mark a specific installment as paid
router.patch('/payments/:id/mark-paid', markInstallmentPaid);

// List all overdue installments (dashboard / alerts)
router.get('/payments/overdue', getOverduePayments);

export default router;
