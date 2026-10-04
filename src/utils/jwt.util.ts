import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.config';
import { AppError } from '../errors/AppError';
import { findUserById, saveRefreshToken } from '../repositories/user.repositories';
import { logger } from '../lib/logger.lib';

//* Create a new token and return it
export function createToken(payload: object, token_secret: string, expiresIn: string): string {
  if (!token_secret) {
    throw new Error('JWT_SECRET is missing in environment variables');
  }

  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, token_secret, options);
}

//* Generate access and refresh tokens
export const generateAccessAndRefereshTokens = async (userId: string) => {
  try {
    const user = await findUserById(userId);

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const accessToken = createToken(
      { id: user.id },
      env.JWT_ACCESS_TOKEN_SECRET,
      env.JWT_ACCESS_TOKEN_EXPIRY
    );

    const refreshToken = createToken(
      { id: user.id },
      env.JWT_REFRESH_TOKEN_SECRET,
      env.JWT_REFRESH_TOKEN_EXPIRY
    );

    await saveRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }

    logger.error('Error generating tokens:', error);

    throw new AppError(
      500,
      `Something went wrong while generating refresh and access token: ${error.message || error}`
    );
  }
};
