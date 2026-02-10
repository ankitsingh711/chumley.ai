import { Router } from 'express';
import { createRequest, getRequests, getRequestById, updateRequestStatus, deleteRequest, addAttachment } from '../controllers/request.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createRequest);
router.get('/', getRequests);
router.get('/:id', getRequestById);

// All authenticated users can update status
router.patch('/:id/status', updateRequestStatus);
router.post('/:id/attachments', addAttachment);

router.delete('/:id', deleteRequest);

export default router;
