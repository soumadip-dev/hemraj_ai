import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/AppError';
import { type Role } from '../constants/role.constants';

export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Authentication required');
      }

      if (!allowedRoles.includes(req.user.role as Role)) {
        throw new AppError(403, 'You do not have permission to perform this action');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
