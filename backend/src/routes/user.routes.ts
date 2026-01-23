import { Router } from 'express';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Protect all user routes
router.use(authenticate);

router.get('/', authorize([Role.ADMIN, Role.MANAGER]), getUsers);
router.get('/:id', getUserById); // Users can view their own profile (logic to restrict to self needed, or allow read for all authenticated?)
// For now allowing read by ID for authenticated users, but ideally restrict.

router.put('/:id', authorize([Role.ADMIN]), updateUser);
router.delete('/:id', authorize([Role.ADMIN]), deleteUser);

export default router;
