import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger.lib';
import {
  createFollowupSchema,
  followupIdSchema,
  getFollowupsSchema,
  updateFollowupSchema,
} from '../validator/followup.validator';
import {
  checkDuplicateFollowupExists,
  createFollowup,
  getDebtorById,
  getFollowupById,
  getFollowups,
  getUserWithRoleById,
  updateFollowup,
} from '../repositories/followup.repositories';

export const createFollowupController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.info('create followup');
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const input = createFollowupSchema.parse(req.body);

    // check if debtor exists
    const debtor = await getDebtorById(input.debtorId);

    if (!debtor) {
      throw new AppError(404, 'Debtor not found');
    }

    // Check whether assigned user exists.
    const assignedUser = await getUserWithRoleById(input.assignedTo);

    if (!assignedUser) {
      throw new AppError(404, 'Assigned user not found');
    }

    if (assignedUser.role !== 'agent') {
      throw new AppError(400, 'Follow-up can only be assigned to an agent');
    }

    if (req.user.role === 'manager') {
      // if debter is not in the same department as the manager, throw error
      if (debtor.department_id !== req.user.departmentId) {
        throw new AppError(403, 'You cannot create a follow-up for this debtor');
      }
      // if assigned user is not in the same department as the manager, throw error
      if (assignedUser.department_id !== req.user.departmentId) {
        throw new AppError(403, 'You cannot assign a follow-up to another department');
      }
    }

    if (req.user.role === 'agent') {
      // if debter is not in the same department as the agent, throw error
      if (debtor.department_id !== req.user.departmentId) {
        throw new AppError(403, 'You cannot create a follow-up for this debtor');
      }
      // agent can only assign follow-ups to themselves
      if (input.assignedTo !== req.user.id) {
        throw new AppError(403, 'Agents can only assign follow-ups to themselves');
      }
    }

    // admin can assign follow-ups to any debtor and any agent

    // Now check if a similar follow-up already exists
    const duplicate = await checkDuplicateFollowupExists(
      input.debtorId,
      input.assignedTo,
      input.type,
      input.followUpDate
    );

    if (duplicate) {
      throw new AppError(409, 'A similar pending follow-up already exists');
    }

    const followup = await createFollowup(
      input.debtorId,
      input.assignedTo,
      req.user.id,
      input.type,
      input.followUpDate,
      input.note
    );

    res.status(201).json({
      success: true,
      message: 'Follow-up created successfully',
      data: followup,
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

export const getFollowupsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.info('get follow-ups');
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const input = getFollowupsSchema.parse(req.query);

    let departmentId = null;
    let userId = null;

    if (req.user.role === 'manager') {
      departmentId = req.user.departmentId;
    }

    if (req.user.role === 'agent') {
      userId = req.user.id;
    }

    const followups = await getFollowups(
      departmentId,
      userId,
      input.status,
      input.fromDate,
      input.toDate,
      input.page,
      input.limit
    );

    res.status(200).json({
      success: true,
      message: 'Follow-ups retrieved successfully',
      data: {
        followups,
        pagination: {
          page: input.page,
          limit: input.limit,
          count: followups.length,
        },
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

export const updateFollowupController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.info('update follow-up');
  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    const { id } = followupIdSchema.parse(req.params);

    const input = updateFollowupSchema.parse(req.body);

    const followup = await getFollowupById(id);

    if (!followup) {
      throw new AppError(404, 'Follow-up not found');
    }

    // Manager rules
    if (req.user.role === 'manager') {
      if (followup.department_id !== req.user.departmentId) {
        throw new AppError(403, 'You cannot update this follow-up');
      }

      // check if assigned user is exists
      if (input.assignedTo) {
        const assignedUser = await getUserWithRoleById(input.assignedTo);

        if (!assignedUser) {
          throw new AppError(404, 'Assigned user not found');
        }
        // check if assigned user is agent or not
        if (assignedUser.role !== 'agent') {
          throw new AppError(400, 'Follow-up can only be assigned to an agent');
        }
        // check if assigned user is in same department as manager
        if (assignedUser.department_id !== req.user.departmentId) {
          throw new AppError(403, 'You cannot assign a follow-up to another department');
        }
      }
    }

    // agent rules
    if (req.user.role === 'agent') {
      if (followup.assigned_to !== req.user.id) {
        throw new AppError(403, 'You cannot update this follow-up');
      }

      // Agent cannot assign the follow-up to another user.
      if (input.assignedTo && input.assignedTo !== req.user.id) {
        throw new AppError(403, 'Agents can only assign follow-ups to themselves');
      }
    }

    const updatedFollowup = await updateFollowup(
      id,
      input.assignedTo,
      input.status,
      input.followUpDate,
      input.note
    );
    const io = req.app.get('io');

    io.emit('followup:updated', updatedFollowup);

    res.status(200).json({
      success: true,
      message: 'Follow-up updated successfully',
      data: updatedFollowup,
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};
