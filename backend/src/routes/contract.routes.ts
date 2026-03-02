import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
    getAllContracts,
    getContractById,
    createContract,
    updateContract,
    deleteContract,
} from '../controllers/contract.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(authorize(['SYSTEM_ADMIN']));

// Contract routes
router.get('/', getAllContracts);
router.get('/:id', getContractById);
router.post('/', createContract);
router.put('/:id', updateContract);
router.delete('/:id', deleteContract);

export default router;
