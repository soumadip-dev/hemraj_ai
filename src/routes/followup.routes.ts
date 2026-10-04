import { Router } from 'express';

import {
  createFollowupController,
  getFollowupsController,
  updateFollowupController,
} from '../controllers/followup.controller';

import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorization.middleware';

import { ROLES } from '../constants/role.constants';

export const followupRouter = Router();

followupRouter.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT),
  createFollowupController
);

followupRouter.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT),
  getFollowupsController
);

followupRouter.patch(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT),
  updateFollowupController
);
