import { Router } from 'express';
import { createFotografo } from '../controllers/fotografoController.js';

const router = Router();

router.post('/', createFotografo);

export default router;
