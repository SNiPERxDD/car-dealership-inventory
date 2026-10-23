import request, { type Response } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedAdmin } from '../../db/seed.js';
import { createPool } from '../../src/server/db/pool.js';
import { buildTestApp, resetUsers } from '../support/app.js';
import { insertVehicleFixtures, resetVehicles, type VehicleFixture } from '../support/vehicles.js';

const pool = createPool(process.env.DATABASE_URL);
const app = buildTestApp(pool);
const adminEmail = 'p4-restock-admin@example.com';
const adminPassword = 'p4-restock-admin-password';
const fixture: VehicleFixture = {
  make: 'Toyota',
  model: 'Corolla',
  category: 'sedan',
  price: 21000,
  quantity: 5,
};
const unknownVehicleId = '00000000-0000-4000-8000-000000000002';

let adminToken: string;
let userToken: string;

beforeAll(async () => {
  await resetUsers(pool);
  await seedAdmin({ pool, email: adminEmail, password: adminPassword });
  const adminLogin = await request(app).post('/api/auth/login').send({
    email: adminEmail,
    password: adminPassword,
  });
  expect(adminLogin.status).toBe(200);
  adminToken = adminLogin.body.token as string;

  const registration = await request(app).post('/api/auth/register').send({
    email: 'p4-restock-user@example.com',
    password: 'p4-restock-user-password',
  });
  expect(registration.status).toBe(201);
  userToken = registration.body.token as string;
});

beforeEach(async () => {
  await resetVehicles(pool);
});

afterAll(async () => {
  await pool.end();
});

/** Reads a vehicle's persisted quantity for final-state assertions. */
async function storedQuantity(vehicleId: string): Promise<number | undefined> {
  const result = await pool.query<{ quantity: number }>(
    'SELECT quantity FROM vehicles WHERE id = $1',
    [vehicleId],
  );
  return result.rows[0]?.quantity;
}

/** Checks the public error envelope returned by the API. */
function expectError(response: Response, status: number, code: string): void {
  expect.soft(response.status).toBe(status);
  expect.soft(response.body).toEqual({
    error: { code, message: expect.any(String) },
  });
}

describe('vehicle restock API', () => {
  it('increments quantity for an administrator', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 3 });

    expect.soft(response.status).toBe(200);
    expect.soft(response.body).toEqual({ id: vehicleId, ...fixture, quantity: 8 });
    expect(await storedQuantity(vehicleId)).toBe(8);
  });

  it('rejects restocking by a normal user before checking the vehicle', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 1 });

    expectError(response, 403, 'FORBIDDEN');
    expect(await storedQuantity(vehicleId)).toBe(5);
  });

  it('rejects a normal user for an unknown UUID before existence checks', async () => {
    const response = await request(app)
      .post(`/api/vehicles/${unknownVehicleId}/restock`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 1 });

    expectError(response, 403, 'FORBIDDEN');
    expect(await storedQuantity(unknownVehicleId)).toBeUndefined();
  });

  it.each([
    ['zero', { quantity: 0 }],
    ['negative', { quantity: -1 }],
    ['fractional', { quantity: 1.5 }],
    ['string', { quantity: '3' }],
    ['missing', {}],
    ['extra field', { quantity: 1, unexpected: true }],
  ])('rejects a %s restock quantity', async (_case, body) => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

    expectError(response, 400, 'VALIDATION_ERROR');
    expect(await storedQuantity(vehicleId)).toBe(5);
  });

  it('rejects a quantity above the int4 maximum with 400 VALIDATION_ERROR', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 2147483648 });

    expectError(response, 400, 'VALIDATION_ERROR');
    expect(await storedQuantity(vehicleId)).toBe(5);
  });

  it('rejects a non-UUID identifier with 400 VALIDATION_ERROR', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const response = await request(app)
      .post('/api/vehicles/not-a-uuid/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 1 });

    expectError(response, 400, 'VALIDATION_ERROR');
    expect(await storedQuantity(vehicleId)).toBe(5);
  });

  it('rejects a normal user before validating an invalid identifier or body', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const response = await request(app)
      .post('/api/vehicles/not-a-uuid/restock')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 0, unexpected: true });

    expectError(response, 403, 'FORBIDDEN');
    expect(await storedQuantity(vehicleId)).toBe(5);
  });

  it('validates an administrator identifier before its invalid body', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const response = await request(app)
      .post('/api/vehicles/not-a-uuid/restock')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 0, unexpected: true });

    expectError(response, 400, 'VALIDATION_ERROR');
    expect(await storedQuantity(vehicleId)).toBe(5);
  });

  it('returns 404 VEHICLE_NOT_FOUND for an unknown UUID', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const response = await request(app)
      .post(`/api/vehicles/${unknownVehicleId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 1 });

    expectError(response, 404, 'VEHICLE_NOT_FOUND');
    expect(await storedQuantity(vehicleId)).toBe(5);
    expect(await storedQuantity(unknownVehicleId)).toBeUndefined();
  });

  it('rejects a restock that would exceed the int4 quantity limit', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [
      { ...fixture, quantity: 2147483646 },
    ]);
    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ quantity: 2 });

    expectError(response, 409, 'STOCK_LIMIT_EXCEEDED');
    expect(await storedQuantity(vehicleId)).toBe(2147483646);
  });

  it('rejects a missing token with 401 UNAUTHENTICATED', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .send({ quantity: 1 });

    expectError(response, 401, 'UNAUTHENTICATED');
    expect(await storedQuantity(vehicleId)).toBe(5);
  });

  it('rejects an invalid token with 401 INVALID_TOKEN', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/restock`)
      .set('Authorization', 'Bearer invalid.token')
      .send({ quantity: 1 });

    expectError(response, 401, 'INVALID_TOKEN');
    expect(await storedQuantity(vehicleId)).toBe(5);
  });

  it('adds every concurrent restock exactly once', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [fixture]);
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .post(`/api/vehicles/${vehicleId}/restock`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ quantity: 1 }),
      ),
    );

    expect.soft(responses.map((response) => response.status)).toEqual(Array(10).fill(200));
    expect(await storedQuantity(vehicleId)).toBe(15);
  });
});
