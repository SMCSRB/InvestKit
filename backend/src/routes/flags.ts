import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { flagsController } from '../controllers/adminController';

export const flagsRoutes = Router();
flagsRoutes.get('/', authMiddleware, flagsController.mine);
