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
import http from 'http';
import { Server } from 'socket.io';
import { env } from './config/env.config';

export function createApp() {
  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    },
  });

  // Set the io instance on the app
  app.set('io', io);

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

  return { server, io };
}
