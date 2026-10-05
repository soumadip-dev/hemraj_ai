import { Router } from 'express';
import { getAuditLogsController } from '../controllers/audit.controller';
import { authenticate } from '../middleware/auth.middleware';

export const auditRouter = Router();

auditRouter.get(
  '/',
  authenticate,
  getAuditLogsController
);
