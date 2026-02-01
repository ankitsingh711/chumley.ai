import { Router } from 'express';
import authRoutes from './auth.routes';

const router = Router();

router.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date() });
});

router.use('/auth', authRoutes);
import userRoutes from './user.routes';
router.use('/users', userRoutes);
import supplierRoutes from './supplier.routes';
router.use('/suppliers', supplierRoutes);
import requestRoutes from './request.routes';
router.use('/requests', requestRoutes);
import orderRoutes from './order.routes';
router.use('/orders', orderRoutes);
import reportRoutes from './report.routes';
router.use('/reports', reportRoutes);
import departmentRoutes from './department.routes';
router.use('/departments', departmentRoutes);

export default router;
