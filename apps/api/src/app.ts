import cors from 'cors';
import express, { type Express } from 'express';

import { corsOrigins, isDevelopment } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { requestLog } from './middleware/request-log.js';
import { apiRoutes } from './routes/index.js';

export function createApp(): Express {
  const app = express();

  // Behind a proxy in any hosted environment, so client IPs and protocol
  // come from the forwarded headers rather than the socket.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
      exposedHeaders: ['Content-Disposition'],
    }),
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (isDevelopment) app.use(requestLog);

  app.use('/api/v1', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
