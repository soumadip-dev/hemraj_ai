import { Router } from 'express';

import {
  register,
  login,
  logout,
  refreshAccessToken,
  profile,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { createRateLimiter } from '../middleware/rateLimit.middleware';

export const authRouter = Router();

const loginRateLimiter = createRateLimiter({
  limit: 5,
  windowSeconds: 60,
  keyPrefix: 'login',
  keyGenerator: req => req.ip || 'unknown',
});

authRouter.post('/register', register);
authRouter.post('/login', loginRateLimiter, login);
authRouter.post('/logout', authenticate, logout);
authRouter.post('/refresh', refreshAccessToken);
authRouter.get('/profile', authenticate, profile);
