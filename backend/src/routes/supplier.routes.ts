import { Router } from 'express';
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
    getSupplierInteractions,
    createSupplierInteraction,
    addSupplierDocument,
    addSupplierReview,
    getSupplierReviews,
    approveSupplier,
    rejectSupplier
} from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth.middleware';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

router.use(authenticate);

router.get('/', cacheMiddleware(60), getSuppliers);
router.get('/:id', cacheMiddleware(60), getSupplierById);
router.get('/:id/details', getSupplierDetails);
router.get('/:id/messages', getSupplierMessages);
router.get('/:id/interactions', getSupplierInteractions);

router.post('/', createSupplier);
router.post('/:id/approve', approveSupplier);
router.post('/:id/reject', rejectSupplier);
router.put('/:id', updateSupplier);
router.put('/:id/details', updateSupplierDetails);
router.post('/:id/messages', sendSupplierMessage);
router.post('/:id/interactions', createSupplierInteraction);
router.post('/:id/documents', addSupplierDocument);

router.get('/:id/reviews', getSupplierReviews);
router.post('/:id/reviews', addSupplierReview);

router.delete('/:id', deleteSupplier);

export default router;

