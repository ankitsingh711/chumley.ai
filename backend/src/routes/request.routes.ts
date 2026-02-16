import { Router } from 'express';
import { createRequest, getRequests, getRequestById, updateRequestStatus, deleteRequest, addAttachment } from '../controllers/request.controller';
import { authenticate } from '../middleware/auth.middleware';

import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

router.use(authenticate);

router.post('/', createRequest);
router.get('/', cacheMiddleware(30), getRequests); // Cache for 30s
router.get('/:id', cacheMiddleware(60), getRequestById); // Cache for 60s

// All authenticated users can update status
router.patch('/:id/status', updateRequestStatus);
router.post('/:id/attachments', addAttachment);

router.delete('/:id', deleteRequest);

export default router;
