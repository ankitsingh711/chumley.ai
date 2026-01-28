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
    createSupplierInteraction
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
router.delete('/:id', deleteSupplier);

export default router;

