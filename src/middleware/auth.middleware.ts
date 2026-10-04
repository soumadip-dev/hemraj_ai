import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { AppError } from '../errors/AppError';
import { findUserById } from '../repositories/user.repositories';
import { logger } from '../lib/logger.lib';

export interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // get access token from cookies
    let token = req.cookies?.accessToken as string | undefined;

    if (!token) {
      throw new AppError(401, 'Unauthorized request');
    }

    const decodedToken: JwtPayload = jwt.verify(token, env.JWT_ACCESS_TOKEN_SECRET) as JwtPayload;

    // get the user from the token(id)
    const user = await findUserById(decodedToken.id);

    // } catch (err) {
    //   if (err instanceof jwt.TokenExpiredError) {
    //     throw new AppError(401, 'Access token expired. Please refresh.');
    //   }
    //   if (err instanceof jwt.JsonWebTokenError) {
    //     throw new AppError(401, 'Invalid access token.');
    //   }
    //   throw new AppError(401, 'Authentication failed.');
    // }

    if (!user) {
      throw new AppError(401, 'User no longer exists.');
    }

    req.user = {
      id: user.id,
      role: user.role_name,
      departmentId: user.department_id,
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    next(error);
  }
};
