import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import { credentialsSchema } from './schemas.js';
import type { Credentials } from './schemas.js';
import type { AuthResult, AuthService } from './auth-service.js';
import { validateBody } from '../middleware/validation.js';

/** Creates the register and login HTTP routes for the authentication service. */
export function createAuthRouter(authService: AuthService): Router {
  const router = Router();
  const register: RequestHandler<ParamsDictionary, AuthResult, Credentials> = async (
    request,
    response,
  ) => {
    response.status(201).json(await authService.register(request.body));
  };
  const login: RequestHandler<ParamsDictionary, AuthResult, Credentials> = async (
    request,
    response,
  ) => {
    response.status(200).json(await authService.login(request.body));
  };

  router.post('/auth/register', validateBody(credentialsSchema), register);
  router.post('/auth/login', validateBody(credentialsSchema), login);
  return router;
}
