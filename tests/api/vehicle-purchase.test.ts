import request, { type Response } from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedAdmin } from '../../db/seed.js';
import { createPool } from '../../src/server/db/pool.js';
import { buildTestApp, resetUsers } from '../support/app.js';
import { insertVehicleFixtures, resetVehicles, type VehicleFixture } from '../support/vehicles.js';

const pool = createPool(process.env.DATABASE_URL);
const app = buildTestApp(pool);
const adminEmail = 'p4-purchase-admin@example.com';
const adminPassword = 'p4-purchase-admin-password';
const fixture: VehicleFixture = {
  make: 'Honda',
  model: 'Civic',
  category: 'sedan',
  price: 19999.99,
  quantity: 3,
};
const unknownVehicleId = '00000000-0000-4000-8000-000000000001';

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
    email: 'p4-purchase-user@example.com',
    password: 'p4-purchase-user-password',
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

describe('vehicle purchase API', () => {
  it.each([
    ['normal user', () => userToken],
    ['administrator', () => adminToken],
  ])('%s purchases exactly one unit', async (_role, token) => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 2 }]);

    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', `Bearer ${token()}`);

    expect.soft(response.status).toBe(200);
    expect.soft(response.body).toEqual({ id: vehicleId, ...fixture, quantity: 1 });
    expect(await storedQuantity(vehicleId)).toBe(1);
  });

  it('allows an absent or empty purchase body', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 2 }]);
    const absentBodyResponse = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', `Bearer ${userToken}`);

    expect.soft(absentBodyResponse.status).toBe(200);
    expect.soft(absentBodyResponse.body).toEqual({ id: vehicleId, ...fixture, quantity: 1 });

    const emptyBodyResponse = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect.soft(emptyBodyResponse.status).toBe(200);
    expect.soft(emptyBodyResponse.body).toEqual({ id: vehicleId, ...fixture, quantity: 0 });
    expect(await storedQuantity(vehicleId)).toBe(0);
  });

  it('returns zero after the last unit and rejects the next purchase', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 1 }]);
    const purchased = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', `Bearer ${userToken}`);

    expect.soft(purchased.status).toBe(200);
    expect.soft(purchased.body).toEqual({ id: vehicleId, ...fixture, quantity: 0 });

    const rejected = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', `Bearer ${userToken}`);

    expectError(rejected, 409, 'OUT_OF_STOCK');
    expect(await storedQuantity(vehicleId)).toBe(0);
  });

  it('rejects a purchase when stock is already zero', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 0 }]);
    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', `Bearer ${userToken}`);

    expectError(response, 409, 'OUT_OF_STOCK');
    expect(await storedQuantity(vehicleId)).toBe(0);
  });

  it('stops repeated sequential purchases at zero', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 3 }]);
    for (const quantity of [2, 1, 0]) {
      const response = await request(app)
        .post(`/api/vehicles/${vehicleId}/purchase`)
        .set('Authorization', `Bearer ${userToken}`);
      expect.soft(response.status).toBe(200);
      expect.soft(response.body).toEqual({ id: vehicleId, ...fixture, quantity });
    }

    const rejected = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', `Bearer ${userToken}`);

    expectError(rejected, 409, 'OUT_OF_STOCK');
    expect(await storedQuantity(vehicleId)).toBe(0);
  });

  it('returns 404 VEHICLE_NOT_FOUND for an unknown UUID', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 2 }]);
    const response = await request(app)
      .post(`/api/vehicles/${unknownVehicleId}/purchase`)
      .set('Authorization', `Bearer ${userToken}`);

    expectError(response, 404, 'VEHICLE_NOT_FOUND');
    expect(await storedQuantity(vehicleId)).toBe(2);
  });

  it('rejects a non-UUID identifier with 400 VALIDATION_ERROR', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 2 }]);
    const response = await request(app)
      .post('/api/vehicles/not-a-uuid/purchase')
      .set('Authorization', `Bearer ${userToken}`);

    expectError(response, 400, 'VALIDATION_ERROR');
    expect(await storedQuantity(vehicleId)).toBe(2);
  });

  it('rejects a purchase body with fields', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 2 }]);
    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ quantity: 5 });

    expectError(response, 400, 'VALIDATION_ERROR');
    expect(await storedQuantity(vehicleId)).toBe(2);
  });

  it('rejects a missing token with 401 UNAUTHENTICATED', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 2 }]);
    const response = await request(app).post(`/api/vehicles/${vehicleId}/purchase`);

    expectError(response, 401, 'UNAUTHENTICATED');
    expect(await storedQuantity(vehicleId)).toBe(2);
  });

  it('rejects a missing token before validating a non-UUID identifier', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 2 }]);
    const response = await request(app).post('/api/vehicles/not-a-uuid/purchase');

    expectError(response, 401, 'UNAUTHENTICATED');
    expect(await storedQuantity(vehicleId)).toBe(2);
  });

  it('rejects an invalid token with 401 INVALID_TOKEN', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 2 }]);
    const response = await request(app)
      .post(`/api/vehicles/${vehicleId}/purchase`)
      .set('Authorization', 'Bearer invalid.token');

    expectError(response, 401, 'INVALID_TOKEN');
    expect(await storedQuantity(vehicleId)).toBe(2);
  });

  it('allows exactly one concurrent purchase of the last unit', async () => {
    const [vehicleId] = await insertVehicleFixtures(pool, [{ ...fixture, quantity: 1 }]);
    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        request(app)
          .post(`/api/vehicles/${vehicleId}/purchase`)
          .set('Authorization', `Bearer ${userToken}`),
      ),
    );
    const successfulResponses = responses.filter((response) => response.status === 200);
    const rejectedResponses = responses.filter((response) => response.status === 409);

    expect.soft(successfulResponses).toHaveLength(1);
    if (successfulResponses[0]) {
      expect.soft(successfulResponses[0].body).toEqual({ id: vehicleId, ...fixture, quantity: 0 });
    }
    expect.soft(rejectedResponses).toHaveLength(19);
    for (const response of rejectedResponses) {
      expectError(response, 409, 'OUT_OF_STOCK');
    }
    expect(await storedQuantity(vehicleId)).toBe(0);
  });
});
