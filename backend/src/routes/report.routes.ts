import { Router } from 'express';
import { getKPIs, getMonthlySpend, getDepartmentSpendBreakdown } from '../controllers/report.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/kpi', getKPIs);
router.get('/spend', getMonthlySpend);
router.get('/spend-breakdown', getDepartmentSpendBreakdown);

export default router;
