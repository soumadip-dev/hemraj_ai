import { Router } from 'express';

import {
  createFollowupController,
  getFollowupsController,
  updateFollowupController,
} from '../controllers/followup.controller';

import { authenticate } from '../middleware/auth.middleware';

export const followupRouter = Router();

followupRouter.post('/', authenticate, createFollowupController);

followupRouter.get('/', authenticate, getFollowupsController);

followupRouter.patch('/:id', authenticate, updateFollowupController);
