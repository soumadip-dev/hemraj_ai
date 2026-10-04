import type { Server } from 'socket.io';
import { logger } from './lib/logger.lib';

export const socketHandler = (io: Server) => {
  io.on('connection', socket => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
};
