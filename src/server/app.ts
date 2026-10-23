import express from 'express';
import type pg from 'pg';
import { AuthService } from './auth/auth-service.js';
import { createAuthRouter } from './auth/routes.js';
import { signToken } from './auth/tokens.js';
import type { TokenSigner } from './auth/auth-service.js';
import { UserRepository } from './auth/user-repository.js';
import { createHealthRouter } from './health.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';

export interface AppDependencies {
  pool: pg.Pool;
  jwtSecret: string;
}

/**
 * Builds the Express application. Shared by the local server, the Vercel function and tests,
 * so every dependency is injected rather than created here.
 */
export function createApp({ pool, jwtSecret }: AppDependencies): express.Express {
  const userRepository = new UserRepository(pool);
  const tokenSigner: TokenSigner = (user) => signToken(jwtSecret, user);
  const authService = new AuthService(userRepository, tokenSigner);
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.use(createHealthRouter(pool));
  api.use(createAuthRouter(authService));
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
