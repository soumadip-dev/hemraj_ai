import { Router } from 'express';

import { getAuditLogsController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorization.middleware';
import { ROLES } from '../constants/role.constants';

export const auditRouter = Router();

auditRouter.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT),
  getAuditLogsController
);
