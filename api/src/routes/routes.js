import { Router } from 'express';
import authRouter from './authRoutes.js';
import fotografoRouter from './fotografoRoutes.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/fotografo', fotografoRouter);

export default router;
