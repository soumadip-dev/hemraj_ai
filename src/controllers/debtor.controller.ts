import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.lib';
import { AppError } from '../errors/AppError';
import {
  getDebtorsSchema,
  debtorIdSchema,
  getDebtorTransactionsSchema,
} from '../validator/debtor.validator';
import { getDebtorsQuery, getDebtorByIdQuery } from '../repositories/debtor.repositories';
import { getDebtorTransactionsQuery } from '../repositories/transaction.repositories';

// get all debtors
export const getDebtors = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.info('Getting debtors');

  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    // Validate query parameters
    const filters = getDebtorsSchema.parse(req.query);

    // Get data
    const result = await getDebtorsQuery(req.user.role, req.user.departmentId, filters);

    // Convert null values to simple values for response
    const debtors = result.debtors.map(debtor => ({
      ...debtor,
      // if no transcition found then send 0
      total_outstanding: debtor.total_outstanding === null ? 0 : Number(debtor.total_outstanding),
      // same for here
      ageing_days: debtor.ageing_days === null ? 0 : Number(debtor.ageing_days),

      credit_limit: Number(debtor.credit_limit),
    }));

    res.status(200).json({
      success: true,
      message: 'Debtors fetched successfully',

      data: {
        debtors,

        pagination: {
          page: result.page,
          limit: result.limit,
        },
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

// Get a single deptor by id
export const getDebtorById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.info('Getting debtor by ID');

  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    // Validate ID
    const { id } = debtorIdSchema.parse(req.params);

    // Get debtor
    const debtor = await getDebtorByIdQuery(id, req.user.role, req.user.departmentId);

    if (!debtor) {
      throw new AppError(404, 'Debtor not found');
    }

    res.status(200).json({
      success: true,
      message: 'Debtor fetched successfully',

      data: {
        id: debtor.id,
        departmentId: debtor.department_id,
        name: debtor.name,
        email: debtor.email,
        phone: debtor.phone,
        riskLevel: debtor.risk_level,
        priority: debtor.priority,
        creditLimit: Number(debtor.credit_limit),
        createdAt: debtor.created_at,
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

// Get debtor transactions
export const getDebtorTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.info('Getting debtor transactions');

  try {
    if (!req.user) {
      throw new AppError(401, 'Authentication required');
    }

    // Validate params + query
    const parsedQuery = getDebtorTransactionsSchema.parse({
      ...req.query,
      id: req.params.id,
    });

    // Check debtor access first admin -manager agent checking is happening here
    const debtor = await getDebtorByIdQuery(parsedQuery.id, req.user.role, req.user.departmentId);

    if (!debtor) {
      throw new AppError(404, 'Debtor not found');
    }

    // Get transactions
    const result = await getDebtorTransactionsQuery(parsedQuery);

    const transactions = result.transactions.map(transaction => ({
      ...transaction,

      amount: Number(transaction.amount),

      outstanding_amount: Number(transaction.outstanding_amount),

      ageing_days: Number(transaction.ageing_days),
    }));

    res.status(200).json({
      success: true,
      message: 'Debtor transactions fetched successfully',

      data: {
        debtor: {
          id: debtor.id,
          name: debtor.name,
        },

        transactions,

        pagination: {
          page: result.page,
          limit: result.limit,
        },
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};
