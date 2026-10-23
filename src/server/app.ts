import express from 'express';
import type pg from 'pg';
import { createHealthRouter } from './health.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

export interface AppDependencies {
  pool: pg.Pool;
}

/**
 * Builds the Express application. Shared by the local server, the Vercel function and tests,
 * so every dependency is injected rather than created here.
 */
export function createApp({ pool }: AppDependencies): express.Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.use(createHealthRouter(pool));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
