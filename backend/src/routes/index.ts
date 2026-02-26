import { Router } from 'express';
import authRoutes from './auth.routes';
import healthRoutes from './health.routes';

const router = Router();

router.use('/health', healthRoutes);


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
import contractRoutes from './contract.routes';
router.use('/contracts', contractRoutes);
import chatRoutes from './chat.routes';
router.use('/chat', chatRoutes);
import uploadRoutes from './upload.routes';
router.use('/upload', uploadRoutes);
import categoryRoutes from './category.routes';
router.use('/categories', categoryRoutes);
import notificationRoutes from './notification.routes';
router.use('/notifications', notificationRoutes);
import exportRoutes from './export.routes';
router.use('/export', exportRoutes);

export default router;
