import { Router } from 'express';
import { getUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protect all user routes
router.use(authenticate);

router.get('/', getUsers);
router.get('/:id', getUserById);

router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
