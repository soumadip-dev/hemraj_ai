// Entry file for express server
// express related logic

import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { configCors } from './config/cors.config';
import { NotFound } from './middleware/notFound.middleware';
import { errorHandler } from './middleware/errorhandler.middleware';
import { apiRouter } from './routes';
import { auditMiddleware } from './middleware/audit.middleware';

export function createApp() {
  const app = express();

  app.use(configCors());
  app.use(helmet());
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(auditMiddleware);

  // routes
  app.use('/api', apiRouter);

  app.use(NotFound);
  app.use(errorHandler);

  return app;
}
