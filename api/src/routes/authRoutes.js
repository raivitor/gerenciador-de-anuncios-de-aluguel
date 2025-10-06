import { Router } from 'express';
import { auth } from '../controllers/authController.js';

const router = Router();

router.post('/', auth);

export default router;
