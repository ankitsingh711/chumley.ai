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
    getSupplierReviews
} from '../controllers/supplier.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', getSuppliers);
router.get('/:id', getSupplierById);
router.get('/:id/details', getSupplierDetails);
router.get('/:id/messages', getSupplierMessages);
router.get('/:id/interactions', getSupplierInteractions);

router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.put('/:id/details', updateSupplierDetails);
router.post('/:id/messages', sendSupplierMessage);
router.post('/:id/interactions', createSupplierInteraction);
router.post('/:id/documents', addSupplierDocument);

router.get('/:id/reviews', getSupplierReviews);
router.post('/:id/reviews', addSupplierReview);

router.delete('/:id', deleteSupplier);

export default router;

