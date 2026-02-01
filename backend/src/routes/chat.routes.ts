import { Router } from 'express';
import { handleChat } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, handleChat);

export default router;
