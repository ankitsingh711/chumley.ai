import { Router } from 'express';
import { getUsers, getUserById, updateUser, deleteUser, inviteUser } from '../controllers/user.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// Protect all user routes
router.use(authenticate);

router.get('/', getUsers);
router.post('/invite', authorize(['SYSTEM_ADMIN', 'SENIOR_MANAGER']), inviteUser);
router.get('/:id', getUserById);

router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
