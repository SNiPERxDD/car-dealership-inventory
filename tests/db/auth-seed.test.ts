import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createPool } from '../../src/server/db/pool.js';
import { seedAdmin } from '../../db/seed.js';
import { buildTestApp, resetUsers } from '../support/app.js';

const pool = createPool(process.env.DATABASE_URL);
const app = buildTestApp(pool);

beforeEach(async () => {
  await resetUsers(pool);
});

afterAll(async () => {
  await pool.end();
});

describe('seedAdmin', () => {
  it('is idempotent and leaves one admin row', async () => {
    await seedAdmin({ pool, email: 'admin@example.com', password: 'first-admin-password' });
    await seedAdmin({ pool, email: 'ADMIN@example.com', password: 'updated-admin-password' });

    expect((await pool.query('SELECT email, role FROM users')).rows).toEqual([
      { email: 'admin@example.com', role: 'admin' },
    ]);
  });

  it('updates the password for an existing seeded admin', async () => {
    await seedAdmin({ pool, email: 'admin@example.com', password: 'first-admin-password' });
    await seedAdmin({ pool, email: 'ADMIN@example.com', password: 'updated-admin-password' });

    const oldPassword = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'first-admin-password',
    });
    const updatedPassword = await request(app).post('/api/auth/login').send({
      email: 'admin@example.com',
      password: 'updated-admin-password',
    });

    expect(oldPassword.status).toBe(401);
    expect(oldPassword.body).toEqual({
      error: { code: 'INVALID_CREDENTIALS', message: expect.any(String) },
    });
    expect(updatedPassword.status).toBe(200);
    expect(updatedPassword.body).toEqual({
      token: expect.any(String),
      user: { id: expect.any(String), email: 'admin@example.com', role: 'admin' },
    });
  });

  it('promotes an existing user with the seeded email to admin', async () => {
    const registered = await request(app).post('/api/auth/register').send({
      email: 'promote@example.com',
      password: 'existing-user-password',
    });
    await seedAdmin({ pool, email: 'promote@example.com', password: 'seeded-admin-password' });
    const promoted = await request(app).post('/api/auth/login').send({
      email: 'PROMOTE@example.com',
      password: 'seeded-admin-password',
    });

    expect(registered.status).toBe(201);
    expect(registered.body.user.role).toBe('user');
    expect(promoted.status).toBe(200);
    expect(promoted.body).toEqual({
      token: expect.any(String),
      user: { id: expect.any(String), email: 'promote@example.com', role: 'admin' },
    });
  });

  it('allows seeded credentials to log in with the admin role', async () => {
    await seedAdmin({ pool, email: 'admin@example.com', password: 'seeded-admin-password' });
    const response = await request(app).post('/api/auth/login').send({
      email: 'ADMIN@example.com',
      password: 'seeded-admin-password',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      token: expect.any(String),
      user: { id: expect.any(String), email: 'admin@example.com', role: 'admin' },
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password|password_hash/i);
  });
});
