import type { NextFunction, Request, Response } from 'express';
import { createAuditLog } from '../repositories/audit.repositories';
import { logger } from '../lib/logger.lib';

export const auditMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  res.on('finish', async () => {
    try {
      // audit only auth users
      if (!req.user) {
        return;
      }

      const action = `${req.method} ${req.originalUrl}`;

      await createAuditLog(req.user.id, action, req.method, req.originalUrl, res.statusCode);
    } catch (error) {
      logger.error('Audit middleware error:', error);
    }
  });

  next();
};
