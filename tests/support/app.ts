import type pg from 'pg';
import { SignJWT } from 'jose';
import { createApp } from '../../src/server/app.js';

export const TEST_JWT_SECRET = 'test-only-secret-with-at-least-thirty-two-characters';
export const TEST_USER_ID = '8a5b79d0-6e8e-40cb-a05e-7902b245fd14';

interface TestTokenOptions {
  role?: 'user' | 'admin';
  signingSecret?: Uint8Array;
  expirationTime?: string | number;
  algorithm?: 'HS256' | 'HS384' | 'none';
}

/** Builds the application with the shared test signing key. */
export function buildTestApp(pool: pg.Pool) {
  return createApp({ pool, jwtSecret: TEST_JWT_SECRET });
}

/** Creates test tokens for valid, invalid, and expired authentication cases. */
export async function createTestToken({
  role = 'user',
  signingSecret = new TextEncoder().encode(TEST_JWT_SECRET),
  expirationTime = '1h',
  algorithm = 'HS256',
}: TestTokenOptions = {}): Promise<string> {
  if (algorithm === 'none') {
    const issuedAt = Math.floor(Date.now() / 1000);
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: algorithm, typ: 'JWT' })}.${encode({
      sub: TEST_USER_ID,
      role,
      iat: issuedAt,
      exp: issuedAt + 3600,
    })}.`;
  }
  return new SignJWT({ role })
    .setProtectedHeader({ alg: algorithm })
    .setSubject(TEST_USER_ID)
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(signingSecret);
}

/** Empties `users` between tests; tolerates the table not existing before its migration lands. */
export async function resetUsers(pool: pg.Pool): Promise<void> {
  const usersTable = await pool.query("SELECT to_regclass('public.users') AS users_table");
  if (usersTable.rows[0].users_table) {
    await pool.query('TRUNCATE users RESTART IDENTITY CASCADE');
  }
}
