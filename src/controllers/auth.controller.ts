import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.lib';
import { loginSchema, registerSchema } from '../validator/auth.validator';
import { AppError } from '../errors/AppError';
import { checkDepartmentExists } from '../repositories/department.repositories';
import {
  createUser,
  deleteRefreshToken,
  findUserByEmail,
  findUserByEmailWithRole,
  findUserById,
  incrementFailedAttempts,
  lockUser,
  resetFailedAttempts,
} from '../repositories/user.repositories';
import { findRoleByName } from '../repositories/role.repositories';
import { hashPassword, verifyPassword } from '../utils/password.util';
import { generateAccessAndRefereshTokens } from '../utils/jwt.util';
import { accessCookieOptions, refreshCookieOptions } from '../config/cookie.config';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { env } from '../config/env.config';

const DEFAULT_ROLE = 'agent';
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

//* Register a new user
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  logger.info('Registering user...');
  try {
    const parsedBody = registerSchema.parse(req.body);

    const { fullName, email, password, departmentId } = parsedBody;

    const department = await checkDepartmentExists(departmentId);
    if (!department) {
      throw new AppError(400, 'Department does not exist');
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      throw new AppError(409, 'Email already registered');
    }

    const role = await findRoleByName(DEFAULT_ROLE);
    if (!role) {
      throw new AppError(500, 'Default role not configured');
    }

    const passwordHash = await hashPassword(password);

    const newUser = await createUser({
      fullName,
      email,
      passwordHash,
      departmentId: department.id,
      roleId: role.id,
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please log in.',
      data: {
        id: newUser.id,
        fullName: newUser.full_name,
        email: newUser.email,
        createdAt: newUser.created_at,
        department: {
          id: department.id,
          name: department.name,
        },
        role: {
          id: role.id,
          name: role.name,
        },
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

//* Login a user
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  logger.info('Logging in user...');
  try {
    const parsedBody = loginSchema.parse(req.body);
    const { email, password } = parsedBody;

    const user = await findUserByEmailWithRole(email);

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    // locked_until check
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      throw new AppError(423, `Account locked. Try again in ${minutesLeft} minutes.`);
    }

    // password verify
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      const failedAttempts = user.failed_login_attempts + 1;

      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockTime = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);

        await lockUser(user.id, lockTime);
        throw new AppError(
          423,
          `Too many failed attempts. Account locked for ${LOCK_DURATION_MINUTES} minutes.`
        );
      }
      await incrementFailedAttempts(user.id);
      throw new AppError(401, 'Invalid email or password');
    }

    // if correct password then reset failed attempts to 0
    await resetFailedAttempts(user.id);

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user.id);

    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        createdAt: user.created_at,
        department: {
          id: user.department_id,
          name: user.department_name,
        },
        role: {
          id: user.role_id,
          name: user.role_name,
        },
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

//* logout user
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  logger.info('Logging out user...');
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized request');
    }

    const userId = req.user.id;

    await deleteRefreshToken(userId);

    res.clearCookie('accessToken', accessCookieOptions);
    res.clearCookie('refreshToken', refreshCookieOptions);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });

    logger.info('User logged out successfully');
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

//* refresh access token
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  logger.info('Refreshing access token...');
  try {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
      throw new AppError(401, 'Unauthorized request');
    }

    const decodedToken: JwtPayload = jwt.verify(
      incomingRefreshToken,
      env.JWT_REFRESH_TOKEN_SECRET
    ) as JwtPayload;

    const user = await findUserById(decodedToken.id);

    if (!user) {
      throw new AppError(401, 'Invalid refresh token');
    }

    if (incomingRefreshToken !== user.refresh_token) {
      throw new AppError(401, 'Refresh token is expired or used');
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefereshTokens(
      user.id
    );

    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    res.status(200).json({
      success: true,
      message: 'Access token refreshed',
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};

//* profile
export const profile = async (req: Request, res: Response, next: NextFunction) => {
  logger.info('Getting user profile...');
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized request');
    }
    const userId = req.user.id;
    const user = await findUserById(userId);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    res.status(200).json({
      success: true,
      message: 'User profile fetched',
      data: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        createdAt: user.created_at,
        department: {
          id: user.department_id,
          name: user.department_name,
        },
        role: {
          id: user.role_id,
          name: user.role_name,
        },
      },
    });
  } catch (error) {
    logger.error(error);
    next(error);
  }
};
