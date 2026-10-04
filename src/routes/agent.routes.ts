import { Router } from 'express';
import { agentQuery } from '../controllers/agent.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorization.middleware';
import { ROLES } from '../constants/role.constants';
import { createRateLimiter } from '../middleware/rateLimit.middleware';

export const agentRouter = Router();

const agentRateLimiter = createRateLimiter({
  limit: 30,
  windowSeconds: 60,
  keyPrefix: 'agent',
  keyGenerator: req => req.user?.id || 'unknown',
});

agentRouter.post(
  '/query',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT),
  agentRateLimiter,
  agentQuery
);
