import { Router } from 'express';

import { createFeedbackController } from '../controllers/feedback.controller';

import { authenticate } from '../middleware/auth.middleware';

export const feedbackRouter = Router();

feedbackRouter.post(
  '/',
  authenticate,
  createFeedbackController
);
