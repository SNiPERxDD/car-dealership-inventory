import type { RequestHandler } from 'express';
import { verifyToken } from '../auth/tokens.js';
import type { AuthenticatedUser } from '../auth/tokens.js';
import { HttpError } from './errors.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

/** Verifies a bearer token and attaches its validated user claims to the request. */
export function requireAuth(jwtSecret: string): RequestHandler {
  return async (request, _response, next) => {
    const authorization = request.get('Authorization');
    if (authorization === undefined) {
      next(new HttpError(401, 'UNAUTHENTICATED', 'Authentication is required'));
      return;
    }
    const match = /^Bearer\s+(\S+)$/i.exec(authorization);
    if (!match) {
      next(new HttpError(401, 'INVALID_TOKEN', 'The bearer token is invalid'));
      return;
    }
    try {
      request.user = await verifyToken(jwtSecret, match[1]!);
      next();
    } catch {
      next(new HttpError(401, 'INVALID_TOKEN', 'The bearer token is invalid'));
    }
  };
}

/** Restricts the route to requests authenticated with an admin role. */
export const requireAdmin: RequestHandler = (request, _response, next) => {
  if (request.user?.role !== 'admin') {
    next(new HttpError(403, 'FORBIDDEN', 'Administrator access is required'));
    return;
  }
  next();
};
