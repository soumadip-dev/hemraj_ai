import { Router } from 'express';

import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorization.middleware';

import { getDebtorById, getDebtors, getDebtorTransactions } from '../controllers/debtor.controller';

import { ROLES } from '../constants/role.constants';

export const debtorRouter = Router();

debtorRouter.get('/', authenticate, authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT), getDebtors);

debtorRouter.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT),
  getDebtorById
);

debtorRouter.get(
  '/:id/transactions',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.MANAGER, ROLES.AGENT),
  getDebtorTransactions
);
