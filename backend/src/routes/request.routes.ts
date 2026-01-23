import { Router } from 'express';
import { createRequest, getRequests, getRequestById, updateRequestStatus } from '../controllers/request.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.post('/', createRequest);
router.get('/', getRequests);
router.get('/:id', getRequestById);

// Only Approvers/Admins can update status
router.patch('/:id/status', authorize([Role.ADMIN, Role.APPROVER, Role.MANAGER]), updateRequestStatus);

export default router;
