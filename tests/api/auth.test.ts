import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { decodeJwt, decodeProtectedHeader } from 'jose';
import { createPool } from '../../src/server/db/pool.js';
import { buildTestApp, resetUsers } from '../support/app.js';

const pool = createPool(process.env.DATABASE_URL);
const app = buildTestApp(pool);

beforeEach(async () => {
  await resetUsers(pool);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await pool.end();
});

/** Checks the public response shape and rejects credential leakage. */
function expectAuthResponse(response: { body: Record<string, unknown> }, email: string): void {
  expect(response.body).toEqual({
    token: expect.any(String),
    user: { id: expect.any(String), email, role: expect.any(String) },
  });
  expect(JSON.stringify(response.body)).not.toMatch(/password|password_hash/i);
}

describe('POST /api/auth/register and /api/auth/login', () => {
  it('registers a user and returns 201 with a public user and token', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'driver@example.com',
      password: 'correct horse battery staple',
    });

    expect(response.status).toBe(201);
    expectAuthResponse(response, 'driver@example.com');
    expect(response.body.user.role).toBe('user');
  });

  it('trims and lower-cases the email stored during registration', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: '  Driver@Example.COM ',
      password: 'correct horse battery staple',
    });

    expect(response.status).toBe(201);
    expect((await pool.query('SELECT email FROM users')).rows).toEqual([
      { email: 'driver@example.com' },
    ]);
  });

  it('stores a bcrypt password hash instead of the submitted password', async () => {
    const password = 'correct horse battery staple';
    const response = await request(app).post('/api/auth/register').send({
      email: 'driver@example.com',
      password,
    });

    expect(response.status).toBe(201);
    const storedUser = await pool.query('SELECT password_hash FROM users');
    expect(storedUser.rows).toHaveLength(1);
    expect(storedUser.rows[0].password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(storedUser.rows[0].password_hash).not.toBe(password);
  });

  it('issues an HS256 token for the registered user with a one-hour expiry', async () => {
    const response = await request(app).post('/api/auth/register').send({
      email: 'driver@example.com',
      password: 'correct horse battery staple',
    });
    expect(response.status).toBe(201);
    const token = decodeJwt(response.body.token);
    expect(token.sub).toBe(response.body.user.id);
    expect(token.role).toBe('user');
    expect(decodeProtectedHeader(response.body.token).alg).toBe('HS256');
    expect(token.exp! - token.iat!).toBe(3600);
  });

  it('logs in and returns the same public user shape without a password field', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'driver@example.com',
      password: 'correct horse battery staple',
    });

    const response = await request(app).post('/api/auth/login').send({
      email: 'DRIVER@example.com',
      password: 'correct horse battery staple',
    });

    expect(response.status).toBe(200);
    expectAuthResponse(response, 'driver@example.com');
    expect(response.body.user.role).toBe('user');
    expect(decodeJwt(response.body.token).sub).toBe(response.body.user.id);
  });

  it('returns the same 401 code and message for an unknown email and a wrong password', async () => {
    const unknownEmail = await request(app).post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'correct horse battery staple',
    });
    await request(app).post('/api/auth/register').send({
      email: 'driver@example.com',
      password: 'correct horse battery staple',
    });
    const wrongPassword = await request(app).post('/api/auth/login').send({
      email: 'driver@example.com',
      password: 'incorrect password',
    });

    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.body).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: expect.any(String) },
    });
    expect(wrongPassword.body.error).toEqual(unknownEmail.body.error);
  });

  it('rejects a duplicate email regardless of case', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'driver@example.com',
      password: 'correct horse battery staple',
    });
    const duplicate = await request(app).post('/api/auth/register').send({
      email: 'DRIVER@example.com',
      password: 'another correct password',
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      error: { code: 'EMAIL_TAKEN', message: expect.any(String) },
    });
    expect((await pool.query('SELECT count(*)::int AS count FROM users')).rows[0].count).toBe(1);
  });

  it('allows exactly one of twenty concurrent registrations for the same email', async () => {
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        request(app)
          .post('/api/auth/register')
          .send({
            email: 'race@example.com',
            password: `password-${index}-valid`,
          }),
      ),
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 409)).toHaveLength(19);
    expect(responses.find((response) => response.status === 409)?.body).toEqual({
      error: { code: 'EMAIL_TAKEN', message: expect.any(String) },
    });
    expect((await pool.query('SELECT count(*)::int AS count FROM users')).rows[0].count).toBe(1);
  });

  it.each([
    { case: 'an invalid email', body: { email: 'not-an-email', password: 'valid-password' } },
    {
      case: 'an email with a NUL byte',
      body: { email: 'person\u0000@example.com', password: 'valid-password' },
    },
    {
      case: 'an email over 254 characters',
      body: { email: 'a'.repeat(250) + '@example.com', password: 'valid-password' },
    },
    {
      case: 'a password under 8 characters',
      body: { email: 'person@example.com', password: 'short' },
    },
    {
      case: 'a password over 72 UTF-8 bytes',
      body: { email: 'person@example.com', password: 'é'.repeat(37) },
    },
    {
      case: 'a self-assigned admin role',
      body: { email: 'person@example.com', password: 'valid-password', role: 'admin' },
    },
  ])('rejects $case with a validation error and creates no user', async ({ body }) => {
    const response = await request(app).post('/api/auth/register').send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
    expect((await pool.query('SELECT count(*)::int AS count FROM users')).rows[0].count).toBe(0);
  });

  it('rejects an invalid login body with 400 VALIDATION_ERROR', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'person@example.com',
      password: 'short',
      role: 'admin',
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
  });

  it('returns INVALID_JSON for a non-JSON body', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{not json');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_JSON', message: expect.any(String) },
    });
  });

  it('returns 413 PAYLOAD_TOO_LARGE for a 200 kB login body without logging it', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'person@example.com', password: 'x'.repeat(200_000) });

    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      error: { code: 'PAYLOAD_TOO_LARGE', message: expect.any(String) },
    });
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('returns 415 UNSUPPORTED_MEDIA_TYPE for an unsupported JSON charset without logging it', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json; charset=latin9')
      .send(JSON.stringify({ email: 'person@example.com', password: 'valid-password' }));

    expect(response.status).toBe(415);
    expect(response.body).toEqual({
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: expect.any(String) },
    });
    expect(errorLog).not.toHaveBeenCalled();
  });
});
