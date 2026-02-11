import { Router } from 'express';
import { upload, uploadFile } from '../controllers/upload.controller';

const router = Router();

router.post('/', upload.single('file'), uploadFile);

export default router;
