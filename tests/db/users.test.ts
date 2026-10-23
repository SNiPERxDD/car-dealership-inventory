import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createPool } from '../../src/server/db/pool.js';
import { resetUsers } from '../support/app.js';

const pool = createPool(process.env.DATABASE_URL);

beforeEach(async () => {
  await resetUsers(pool);
});

afterAll(async () => {
  await pool.end();
});

describe('users storage', () => {
  it('rejects roles outside user and admin', async () => {
    const usersTable = await pool.query("SELECT to_regclass('public.users') AS users_table");
    expect(usersTable.rows[0].users_table).toBe('users');
    await expect(
      pool.query("INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'superuser')", [
        'invalid-role@example.com',
        '$2b$10$fakehash',
      ]),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('enables row-level security on users', async () => {
    const usersTable = await pool.query("SELECT to_regclass('public.users') AS users_table");
    expect(usersTable.rows[0].users_table).toBe('users');
    const result = await pool.query(
      `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.users'::regclass`,
    );

    expect(result.rows[0].relrowsecurity).toBe(true);
  });
});
