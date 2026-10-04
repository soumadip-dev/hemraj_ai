import { Router } from 'express';

import { createFeedbackController } from '../controllers/feedback.controller';

import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorization.middleware';
import { ROLES } from '../constants/role.constants';

export const feedbackRouter = Router();

feedbackRouter.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT),
  createFeedbackController
);
