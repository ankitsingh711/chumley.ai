import { Router } from 'express';
import { getSuppliers, getSupplierById, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplier.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', getSuppliers);
router.get('/:id', getSupplierById);

router.post('/', authorize([Role.ADMIN, Role.MANAGER]), createSupplier);
router.put('/:id', authorize([Role.ADMIN, Role.MANAGER]), updateSupplier);
router.delete('/:id', authorize([Role.ADMIN]), deleteSupplier);

export default router;
