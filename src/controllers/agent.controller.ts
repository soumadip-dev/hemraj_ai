import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger.lib';
import { createMessage, createSession, getSessionById } from '../repositories/session.repositories';
import { getDebtorsQuery } from '../repositories/debtor.repositories';
import { agentQuerySchema } from '../validator/agent.validator';
import { getDebtorsSchema, type GetDebtorsInput } from '../validator/debtor.validator';
import { generateDebtorsAnswer, parseDebtorQuery } from '../services/agent.service';

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

    let session;

    if (input.sessionId) {
      session = await getSessionById(input.sessionId);

      if (!session) {
        throw new AppError(404, 'Session not found');
      }

      if (req.user.role === 'agent') {
        if (session.user_id !== req.user.id) {
          throw new AppError(403, 'You cannot access this session');
        }
      }

      if (req.user.role === 'manager') {
        if (session.department_id !== req.user.departmentId) {
          throw new AppError(403, 'You cannot access this session');
        }
      }
    } else {
      session = await createSession(req.user.id);
    }

    await createMessage(session.id, 'user', input.query);

    const { intent, filters } = await parseDebtorQuery(input.query);

    let agentResponse: string;

    if (intent === 'unknown') {
      agentResponse = 'I can currently help with debtor search and filtering requests.';
    } else if (intent === 'get_debtors') {
      const debtorFilters: GetDebtorsInput = getDebtorsSchema.parse(filters);

      const result = await getDebtorsQuery(req.user.role, req.user.departmentId, debtorFilters);

      const debtors = result.debtors.map(debtor => ({
        ...debtor,

        total_outstanding: debtor.total_outstanding === null ? 0 : Number(debtor.total_outstanding),

        ageing_days: debtor.ageing_days === null ? 0 : Number(debtor.ageing_days),

        credit_limit: Number(debtor.credit_limit),
      }));

      if (debtors.length === 0) {
        agentResponse = 'No debtors found matching your request.';
      } else {
        agentResponse = await generateDebtorsAnswer(input.query, debtors);
      }
    } else {
      agentResponse = 'I can currently help with debtor search and filtering requests.';
    }

    // save the ai response as a message
    const agentMessage = await createMessage(session.id, 'agent', agentResponse);

    res.status(200).json({
      success: true,
      message: 'Agent query processed',
      data: {
        sessionId: session.id,
        answer: agentResponse,
        messageId: agentMessage.id,
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};
