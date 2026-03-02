import { Router } from 'express';
import multer from 'multer';
import {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getSupplierDetails,
    updateSupplierDetails,
    getSupplierMessages,
    sendSupplierMessage,
    receiveSupplierMessage,
    receiveSupplierEmailReplyWebhook,
    getSupplierInteractions,
    createSupplierInteraction,
    addSupplierDocument,
    addSupplierReview,
    getSupplierReviews,
    approveSupplier,
    rejectSupplier
} from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth.middleware';
import { rateLimiterMiddleware } from '../middleware/rateLimiter.middleware';

const router = Router();
const inboundEmailParser = multer({
    limits: {
        fields: 100,
        fieldSize: 1024 * 1024, // 1MB per field
    },
}).none();

// Public webhook: supplier reply emails from provider callbacks
router.post(
    '/messages/inbound/email-reply',
    rateLimiterMiddleware('webhook'),
    inboundEmailParser,
    receiveSupplierEmailReplyWebhook
);

router.use(authenticate);

router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.get('/:id/details', getSupplierDetails);
router.get('/:id/messages', getSupplierMessages);
router.get('/:id/interactions', getSupplierInteractions);

router.post('/', createSupplier);
router.post('/:id/approve', approveSupplier);
router.post('/:id/reject', rejectSupplier);
router.put('/:id', updateSupplier);
router.put('/:id/details', updateSupplierDetails);
router.post('/:id/messages', sendSupplierMessage);
router.post('/:id/messages/inbound', receiveSupplierMessage);
router.post('/:id/interactions', createSupplierInteraction);
router.post('/:id/documents', addSupplierDocument);

router.get('/:id/reviews', getSupplierReviews);
router.post('/:id/reviews', addSupplierReview);

router.delete('/:id', deleteSupplier);

export default router;
