import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedAdmin } from '../../db/seed.js';
import { createPool } from '../../src/server/db/pool.js';
import { buildTestApp, resetUsers } from '../support/app.js';
import { insertVehicleFixtures, resetVehicles } from '../support/vehicles.js';

const pool = createPool(process.env.DATABASE_URL);
const app = buildTestApp(pool);
const adminEmail = 'p3-admin@example.com';
const adminPassword = 'p3-admin-password';
const vehicleBody = {
  make: 'Honda',
  model: 'Civic',
  category: 'sedan',
  price: 19999.99,
  quantity: 4,
};

let adminToken: string;
let userToken: string;

beforeAll(async () => {
  await resetUsers(pool);
  adminToken = await seedAdminToken();
  userToken = await registerUserToken();
});

beforeEach(async () => {
  await resetVehicles(pool);
});

afterAll(async () => {
  await pool.end();
});

/** Registers a normal test account and returns the token from the public API. */
async function registerUserToken(): Promise<string> {
  const response = await request(app).post('/api/auth/register').send({
    email: 'p3-user@example.com',
    password: 'p3-user-password',
  });
  expect(response.status).toBe(201);
  return response.body.token as string;
}

/** Seeds an administrator through the P2 seed API and returns its login token. */
async function seedAdminToken(): Promise<string> {
  await seedAdmin({ pool, email: adminEmail, password: adminPassword });
  const response = await request(app).post('/api/auth/login').send({
    email: adminEmail,
    password: adminPassword,
  });
  expect(response.status).toBe(200);
  return response.body.token as string;
}

describe('vehicle CRUD API', () => {
  it.each([
    ['POST', '/api/vehicles'],
    ['GET', '/api/vehicles'],
    ['GET', '/api/vehicles/search'],
    ['PUT', '/api/vehicles/00000000-0000-4000-8000-000000000001'],
    ['DELETE', '/api/vehicles/00000000-0000-4000-8000-000000000001'],
  ])('%s %s rejects a missing token with 401 UNAUTHENTICATED', async (method, path) => {
    const route = request(app);
    const call =
      method === 'POST'
        ? route.post(path)
        : method === 'PUT'
          ? route.put(path).send(vehicleBody)
          : method === 'DELETE'
            ? route.delete(path)
            : route.get(path);
    const response = await call;

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'UNAUTHENTICATED', message: expect.any(String) },
    });
  });

  it.each([
    ['POST', '/api/vehicles'],
    ['GET', '/api/vehicles'],
    ['GET', '/api/vehicles/search'],
    ['PUT', '/api/vehicles/00000000-0000-4000-8000-000000000001'],
    ['DELETE', '/api/vehicles/00000000-0000-4000-8000-000000000001'],
  ])('%s %s rejects an invalid token with 401 INVALID_TOKEN', async (method, path) => {
    const route = request(app);
    const call =
      method === 'POST'
        ? route.post(path)
        : method === 'PUT'
          ? route.put(path).send(vehicleBody)
          : method === 'DELETE'
            ? route.delete(path)
            : route.get(path);
    const response = await call.set('Authorization', 'Bearer invalid.token');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'INVALID_TOKEN', message: expect.any(String) },
    });
  });

  it('creates a vehicle as an administrator with a numeric price and no timestamps', async () => {
    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(vehicleBody);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: expect.any(String), ...vehicleBody });
    expect(typeof response.body.price).toBe('number');
    expect(response.body).not.toHaveProperty('created_at');
    expect(response.body).not.toHaveProperty('updated_at');
  });

  it('trims vehicle text fields before returning the created vehicle', async () => {
    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...vehicleBody, make: ' Honda ', model: ' Civic ', category: ' sedan ' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ make: 'Honda', model: 'Civic', category: 'sedan' });
  });

  it('rejects vehicle creation by a normal user with 403 FORBIDDEN', async () => {
    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${userToken}`)
      .send(vehicleBody);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: 'FORBIDDEN', message: expect.any(String) } });
  });

  it.each([
    ['make empty', { ...vehicleBody, make: '  ' }],
    ['make over 100 characters', { ...vehicleBody, make: 'm'.repeat(101) }],
    ['model empty', { ...vehicleBody, model: ' ' }],
    ['model over 100 characters', { ...vehicleBody, model: 'm'.repeat(101) }],
    ['category empty', { ...vehicleBody, category: '' }],
    ['category over 100 characters', { ...vehicleBody, category: 'c'.repeat(101) }],
    ['price as a string', { ...vehicleBody, price: '19999.99' }],
    ['negative price', { ...vehicleBody, price: -1 }],
    ['price with more than two decimals', { ...vehicleBody, price: 12.345 }],
    ['price above the maximum', { ...vehicleBody, price: 10000000000 }],
    ['fractional quantity', { ...vehicleBody, quantity: 1.5 }],
    ['negative quantity', { ...vehicleBody, quantity: -1 }],
    ['quantity as a string', { ...vehicleBody, quantity: '4' }],
    ['unknown id field', { ...vehicleBody, id: '00000000-0000-4000-8000-000000000001' }],
  ])('rejects creation with %s as 400 VALIDATION_ERROR', async (_case, body) => {
    const response = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
  });

  it('returns an empty array for an authenticated list with no vehicles', async () => {
    const response = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('lists zero-stock vehicles ordered by make, model, and id', async () => {
    await insertVehicleFixtures(pool, [
      { make: 'Toyota', model: 'Corolla', category: 'sedan', price: 21000, quantity: 0 },
      { make: 'Honda', model: 'Civic', category: 'sedan', price: 19999.99, quantity: 2 },
    ]);
    const response = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((vehicle: { make: string }) => vehicle.make)).toEqual([
      'Honda',
      'Toyota',
    ]);
    expect(response.body[1]).toMatchObject({ quantity: 0, price: 21000 });
  });

  it('updates a vehicle by full replacement and returns the persisted representation', async () => {
    const created = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(vehicleBody);
    expect(created.status).toBe(201);
    const replacement = { ...vehicleBody, make: 'Acura', price: 24950, quantity: 7 };

    const updated = await request(app)
      .put(`/api/vehicles/${created.body.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(replacement);
    const listed = await request(app)
      .get('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(updated.status).toBe(200);
    expect(updated.body).toEqual({ id: created.body.id, ...replacement });
    expect(listed.body).toContainEqual({ id: created.body.id, ...replacement });
  });

  it('rejects vehicle updates by a normal user with 403 FORBIDDEN', async () => {
    const response = await request(app)
      .put('/api/vehicles/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${userToken}`)
      .send(vehicleBody);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: 'FORBIDDEN', message: expect.any(String) } });
  });

  it('rejects an invalid vehicle identifier with 400 VALIDATION_ERROR', async () => {
    const response = await request(app)
      .put('/api/vehicles/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(vehicleBody);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
  });

  it('returns 404 VEHICLE_NOT_FOUND when updating an unknown UUID', async () => {
    const response = await request(app)
      .put('/api/vehicles/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(vehicleBody);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'VEHICLE_NOT_FOUND', message: expect.any(String) },
    });
  });

  it('rejects an invalid replacement body with 400 VALIDATION_ERROR', async () => {
    const response = await request(app)
      .put('/api/vehicles/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...vehicleBody, quantity: 1.25 });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
  });

  it('rejects a malformed delete identifier with 400 VALIDATION_ERROR', async () => {
    const response = await request(app)
      .delete('/api/vehicles/not-a-uuid')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
  });

  it('deletes a vehicle as an administrator and returns 204', async () => {
    const created = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(vehicleBody);
    expect(created.status).toBe(201);

    const deleted = await request(app)
      .delete(`/api/vehicles/${created.body.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleted.status).toBe(204);
  });

  it('rejects vehicle deletion by a normal user with 403 before checking existence', async () => {
    const response = await request(app)
      .delete('/api/vehicles/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: 'FORBIDDEN', message: expect.any(String) } });
  });

  it('returns 404 VEHICLE_NOT_FOUND when deleting an unknown UUID', async () => {
    const response = await request(app)
      .delete('/api/vehicles/00000000-0000-4000-8000-000000000001')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: 'VEHICLE_NOT_FOUND', message: expect.any(String) },
    });
  });

  it('returns 404 VEHICLE_NOT_FOUND when deleting the same vehicle a second time', async () => {
    const created = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(vehicleBody);
    expect(created.status).toBe(201);
    await request(app)
      .delete(`/api/vehicles/${created.body.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const deletedAgain = await request(app)
      .delete(`/api/vehicles/${created.body.id as string}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deletedAgain.status).toBe(404);
    expect(deletedAgain.body).toEqual({
      error: { code: 'VEHICLE_NOT_FOUND', message: expect.any(String) },
    });
  });

  it('keeps a created vehicle visible to an app backed by a fresh pool', async () => {
    const created = await request(app)
      .post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(vehicleBody);
    expect(created.status).toBe(201);
    const secondPool = createPool(process.env.DATABASE_URL);
    const secondApp = buildTestApp(secondPool);
    try {
      const listed = await request(secondApp)
        .get('/api/vehicles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listed.status).toBe(200);
      expect(listed.body).toContainEqual({ id: created.body.id, ...vehicleBody });
    } finally {
      await secondPool.end();
    }
  });
});
