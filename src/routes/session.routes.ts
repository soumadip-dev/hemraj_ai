import { Router } from 'express';
import { getSession } from '../controllers/session.controller';
import { authenticate } from '../middleware/auth.middleware';

export const sessionRouter = Router();

sessionRouter.get('/:id', authenticate, getSession);
