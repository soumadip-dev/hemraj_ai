import { Router } from 'express';

import { authenticate } from '../middleware/auth.middleware';

import { getDebtorById, getDebtors, getDebtorTransactions } from '../controllers/debtor.controller';

export const debtorRouter = Router();

debtorRouter.get('/', authenticate, getDebtors);

debtorRouter.get('/:id', authenticate, getDebtorById);

debtorRouter.get('/:id/transactions', authenticate, getDebtorTransactions);
