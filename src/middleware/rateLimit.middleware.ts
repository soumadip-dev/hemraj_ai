import type { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis.config';
import { AppError } from '../errors/AppError';
import { logger } from '../lib/logger.lib';

interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  keyPrefix: string;
  keyGenerator: (req: Request) => string;
}

export function createRateLimiter({
  limit,
  windowSeconds,
  keyPrefix,
  keyGenerator,
}: RateLimitOptions) {
  return async function rateLimiterMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const identifier = keyGenerator(req);

      const rateLimitKey = `rate_limit:${keyPrefix}:${identifier}`;

      // Increment the request count for this identifier.
      const requestCount = await redisClient.incr(rateLimitKey);

      // Set expiration only when the key is created.
      if (requestCount === 1) {
        await redisClient.expire(rateLimitKey, windowSeconds);
      }

      const remainingRequests = Math.max(0, limit - requestCount);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', remainingRequests);

      if (requestCount > limit) {
        return next(new AppError(429, 'Too many requests. Please try again later.'));
      }
      return next();
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };
}
