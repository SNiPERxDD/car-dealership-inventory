import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from './user-repository.js';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

/** Signs an HS256 token with the user's id and role and a one-hour expiry. */
export async function signToken(jwtSecret: string, user: AuthenticatedUser): Promise<string> {
  const secret = new TextEncoder().encode(jwtSecret);
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

/** Verifies an HS256 token and returns only validated id and role claims. */
export async function verifyToken(jwtSecret: string, token: string): Promise<AuthenticatedUser> {
  const secret = new TextEncoder().encode(jwtSecret);
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  if (typeof payload.sub !== 'string' || (payload.role !== 'user' && payload.role !== 'admin')) {
    throw new Error('Invalid authentication claims');
  }
  return { id: payload.sub, role: payload.role };
}
