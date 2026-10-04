import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger.lib';
import {
  createFeedback,
  getMessageWithSession,
  getFeedbackByMessageAndUser,
} from '../repositories/feedback.repositories';
import { feedbackSchema } from '../validator/feedback.validator';

export const createFeedbackController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.info('create feedback');

  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const input = feedbackSchema.parse(req.body);

    // Check if message exists.
    const message = await getMessageWithSession(input.messageId);

    if (!message) {
      throw new AppError(404, 'Agent message not found');
    }

    // Feedback can only be given to agent messages.
    if (message.sender !== 'agent') {
      throw new AppError(400, 'Feedback can only be given to agent messages');
    }

    // Agent can only give feedback to their own session.
    if (req.user.role === 'agent') {
      if (message.user_id !== req.user.id) {
        throw new AppError(403, 'You cannot give feedback for this message');
      }
    }

    // Manager can only access messages from their department.
    if (req.user.role === 'manager') {
      if (message.department_id !== req.user.departmentId) {
        throw new AppError(403, 'You cannot give feedback for this message');
      }
    }

    // Check duplicate feedback.
    const existingFeedback = await getFeedbackByMessageAndUser(input.messageId, req.user.id);

    if (existingFeedback) {
      throw new AppError(409, 'You have already given feedback for this message');
    }

    const feedback = await createFeedback(
      input.messageId,
      req.user.id,
      input.rating,
      input.comment
    );

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: feedback,
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};
