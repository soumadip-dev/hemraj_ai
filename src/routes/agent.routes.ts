import { Router } from 'express';

import { agentQuery } from '../controllers/agent.controller';

import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorization.middleware';

import { ROLES } from '../constants/role.constants';

export const agentRouter = Router();

agentRouter.post(
  '/query',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT),
  agentQuery
);
