import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger.lib';
import { getAuditLogs } from '../repositories/audit.repositories';

export const getAuditLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.info('Getting audit logs');
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    let departmentId: string | null = null;
    let userId: string | null = null;

    // Manager can only see audit logs from their department.
    if (req.user.role === 'manager') {
      departmentId = req.user.departmentId;
    }

    // Agent can only see their own audit logs.
    if (req.user.role === 'agent') {
      userId = req.user.id;
    }

    // Admin can see everything.

    
    const logs = await getAuditLogs(departmentId, userId, page, limit);

    res.status(200).json({
      success: true,
      message: 'Audit logs retrieved successfully',
      data: {
        logs,
        pagination: {
          page,
          limit,
          count: logs.length,
        },
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};
