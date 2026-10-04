import { Router } from 'express';

import {
  register,
  login,
  logout,
  refreshAccessToken,
  profile,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', authenticate, logout);
authRouter.post('/refresh', authenticate, refreshAccessToken);
authRouter.get('/profile', authenticate, profile);
