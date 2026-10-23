import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../../src/server/middleware/errors.js';
import { requireAdmin, requireAuth } from '../../src/server/middleware/auth.js';
import { createTestToken, TEST_JWT_SECRET } from '../support/app.js';

/** Builds a minimal app that exercises both authentication middlewares and the production error handler. */
function createProtectedApp(): express.Express {
  const app = express();
  app.get('/auth', requireAuth(TEST_JWT_SECRET), (_request, response) => {
    response.json({ access: 'authenticated' });
  });
  app.get('/admin', requireAuth(TEST_JWT_SECRET), requireAdmin, (_request, response) => {
    response.json({ access: 'admin' });
  });
  app.use(errorHandler);
  return app;
}

const app = createProtectedApp();

describe('requireAuth and requireAdmin', () => {
  it('returns 401 UNAUTHENTICATED when the authorization header is missing', async () => {
    const response = await request(app).get('/auth');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'UNAUTHENTICATED', message: expect.any(String) },
    });
  });

  it.each(['Bearer', 'Basic abc.def.ghi'])(
    'returns 401 INVALID_TOKEN for malformed authorization header %s',
    async (header) => {
      const response = await request(app).get('/auth').set('Authorization', header);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: 'INVALID_TOKEN', message: expect.any(String) },
      });
    },
  );

  it.each([
    ['garbage token', 'not-a-jwt'],
    [
      'wrong secret',
      () => createTestToken({ signingSecret: new TextEncoder().encode('wrong-secret') }),
    ],
    ['expired token', () => createTestToken({ expirationTime: '0s' })],
    ['algorithm none', () => createTestToken({ algorithm: 'none', role: 'admin' })],
    ['non-HS256 algorithm', () => createTestToken({ algorithm: 'HS384' })],
  ])('returns 401 INVALID_TOKEN for %s', async (_caseName, tokenFactory) => {
    const token = typeof tokenFactory === 'string' ? tokenFactory : await tokenFactory();
    const response = await request(app).get('/auth').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'INVALID_TOKEN', message: expect.any(String) },
    });
  });

  it('returns 401 INVALID_TOKEN when the payload is rewritten to claim the admin role', async () => {
    const token = await createTestToken({ role: 'user' });
    const [header, payload, signature] = token.split('.');
    const claims = JSON.parse(Buffer.from(payload!, 'base64url').toString('utf8'));
    const forgedPayload = Buffer.from(JSON.stringify({ ...claims, role: 'admin' })).toString(
      'base64url',
    );
    const response = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${header}.${forgedPayload}.${signature}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'INVALID_TOKEN', message: expect.any(String) },
    });
  });

  it('allows a valid user token on the auth route', async () => {
    const response = await request(app)
      .get('/auth')
      .set('Authorization', `Bearer ${await createTestToken({ role: 'user' })}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ access: 'authenticated' });
  });

  it('returns 403 FORBIDDEN when a user token accesses the admin route', async () => {
    const response = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${await createTestToken({ role: 'user' })}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: 'FORBIDDEN', message: expect.any(String) } });
  });

  it('allows an admin token on the auth route', async () => {
    const response = await request(app)
      .get('/auth')
      .set('Authorization', `Bearer ${await createTestToken({ role: 'admin' })}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ access: 'authenticated' });
  });

  it('allows an admin token on the admin route', async () => {
    const response = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${await createTestToken({ role: 'admin' })}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ access: 'admin' });
  });
});
