import { Router } from 'express';

import { getSession } from '../controllers/session.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorization.middleware';

import { ROLES } from '../constants/role.constants';

export const sessionRouter = Router();

sessionRouter.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT),
  getSession
);
