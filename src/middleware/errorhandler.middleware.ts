import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { logger } from '../lib/logger.lib';
import { AppError } from '../errors/AppError';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });

    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.issues,
    });

    return;
  }

  logger.error('Unhandled error');

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
