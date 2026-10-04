import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger.lib';
import { createMessage, createSession, getSessionById } from '../repositories/session.repositories';
import { agentQuerySchema } from '../validator/agent.validator';

export const agentQuery = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const input = agentQuerySchema.parse(req.body);

    // Check if session ID exists.
    // If it does not exist, create a new session.
    let session;

    if (input.sessionId) {
      session = await getSessionById(input.sessionId);

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
    } else {
      session = await createSession(req.user.id);
    }

    // Save the user's query as a message.
    await createMessage(session.id, 'user', input.query);

    // Temporary demo response.
    const aiAgentAnswer = 'ABC Manufacturing is a high risk debtor.';

    // Save the agent response as a message.
    const agentMessage = await createMessage(session.id, 'agent', aiAgentAnswer);

    // Send response.
    res.status(200).json({
      success: true,
      message: 'Agent query processed',
      data: {
        sessionId: session.id,
        answer: aiAgentAnswer,
        messageId: agentMessage.id,
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};
