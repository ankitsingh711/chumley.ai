import { Router } from 'express';
import { exportPdf } from '../controllers/export.controller';

const router = Router();

// /api/v1/export/pdf
router.get('/pdf', exportPdf);

export default router;
