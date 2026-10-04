import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { debtorRouter } from './debtor.routes';
import { agentRouter } from './agent.routes';
import { sessionRouter } from './session.routes';
import { followupRouter } from './followup.routes';
import { feedbackRouter } from './feedback.routes';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/debtors', debtorRouter);
apiRouter.use('/agent', agentRouter);
apiRouter.use('/sessions', sessionRouter);
apiRouter.use('/followups', followupRouter);
apiRouter.use('/feedback', feedbackRouter);
