import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger.lib';
import { getSessionById, getSessionMessages } from '../repositories/session.repositories';
import { sessionSchema } from '../validator/agent.validator';

export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = sessionSchema.parse(req.params);

    // Get the session.
    const session = await getSessionById(id);

    if (!session) {
      throw new AppError(404, 'Session not found');
    }

    // Agent can only access their own sessions.
    if (req.user.role === 'agent') {
      if (session.user_id !== req.user.id) {
        throw new AppError(403, 'You cannot access this session');
      }
    }

    // Manager can only access sessions from their department.
    if (req.user.role === 'manager') {
      if (session.department_id !== req.user.departmentId) {
        throw new AppError(403, 'You cannot access this session');
      }
    }

    // Admin has no session access restriction.
    const messages = await getSessionMessages(id);

    res.status(200).json({
      success: true,
      message: 'Session retrieved successfully',
      data: {
        session,
        messages,
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};
