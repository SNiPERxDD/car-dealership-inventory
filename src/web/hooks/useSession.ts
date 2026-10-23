import { useCallback, useState } from 'react';
import { apiRequest } from '../lib/api-client';

export type UserRole = 'user' | 'admin';

export interface PublicUser {
  id: string;
  email: string;
  role: UserRole;
}

interface AuthResult {
  token: string;
  user: PublicUser;
}

interface Session {
  token: string;
  user: PublicUser;
}

const SESSION_KEY = 'car.session';
const USER_KEY = 'car.session.user';

/** Owns sign-in, registration, logout, and expired-session state for the SPA. */
export function useSession() {
  const [session, setSession] = useState<Session | null>(readSession);
  const [expired, setExpired] = useState(false);

  const clearSession = useCallback((wasExpired = false) => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(USER_KEY);
    setSession(null);
    setExpired(wasExpired);
  }, []);

  const authenticate = useCallback(
    async (mode: 'login' | 'register', email: string, password: string) => {
      setExpired(false);
      const result = await apiRequest<AuthResult>(`/api/auth/${mode}`, {
        method: 'POST',
        body: { email, password },
      });
      localStorage.setItem(SESSION_KEY, result.token);
      localStorage.setItem(USER_KEY, JSON.stringify(result.user));
      setSession({ token: result.token, user: result.user });
    },
    [],
  );

  const logout = useCallback(() => clearSession(), [clearSession]);
  const expire = useCallback(() => clearSession(true), [clearSession]);

  return { session, expired, authenticate, logout, expire };
}

/** Restores the token and public identity cached by the last successful sign-in. */
function readSession(): Session | null {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return null;

  try {
    const user: unknown = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    if (isPublicUser(user)) return { token, user };
  } catch {
    // A stale identity cache is discarded with the token when the server rejects it.
  }

  return { token, user: { id: '', email: '', role: 'user' } };
}

/** Confirms the cached identity has the public fields required by the signed-in header. */
function isPublicUser(value: unknown): value is PublicUser {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'string' &&
    'email' in value &&
    typeof value.email === 'string' &&
    'role' in value &&
    (value.role === 'user' || value.role === 'admin')
  );
}
