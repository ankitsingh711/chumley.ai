import { Router } from 'express';
import { exportPdf } from '../controllers/export.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// /api/v1/export/pdf
router.use(authenticate);
router.get('/pdf', exportPdf);

export default router;
