import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/server/app.js';
import { createPool } from '../../src/server/db/pool.js';

const pool = createPool(process.env.DATABASE_URL);
const app = createApp({ pool });

afterAll(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  it('reports the API and database as up', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('returns 503 with the error shape when the database is unreachable', async () => {
    const unreachablePool = createPool('postgres://nobody:nothing@127.0.0.1:1/none');
    const unhealthyApp = createApp({ pool: unreachablePool });

    const response = await request(unhealthyApp).get('/api/health');
    await unreachablePool.end();

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      error: { code: 'DATABASE_UNAVAILABLE', message: expect.any(String) },
    });
  });
});

describe('unknown API routes', () => {
  it('return 404 with the error shape', async () => {
    const response = await request(app).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: expect.any(String) } });
  });
});
