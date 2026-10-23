import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPool } from '../../src/server/db/pool.js';
import { buildTestApp, resetUsers } from '../support/app.js';
import { insertVehicleFixtures, resetVehicles } from '../support/vehicles.js';

const pool = createPool(process.env.DATABASE_URL);
const app = buildTestApp(pool);

let userToken: string;

beforeAll(async () => {
  await resetUsers(pool);
  const response = await request(app).post('/api/auth/register').send({
    email: 'p3-search-user@example.com',
    password: 'p3-search-password',
  });
  expect(response.status).toBe(201);
  userToken = response.body.token as string;
});

beforeEach(async () => {
  await resetVehicles(pool);
  await insertVehicleFixtures(pool, [
    { make: 'Honda', model: 'Civic Sport', category: 'sedan', price: 19999.99, quantity: 3 },
    { make: 'Honda', model: 'CR-V', category: 'suv', price: 32000, quantity: 0 },
    { make: 'Toyota', model: 'Corolla', category: 'sedan', price: 21000, quantity: 5 },
    { make: 'Ford', model: 'F-150', category: 'truck', price: 45000, quantity: 1 },
    { make: '100% Auto', model: 'Under_score', category: 'special', price: 10000, quantity: 1 },
  ]);
});

afterAll(async () => {
  await pool.end();
});

describe('GET /api/vehicles/search', () => {
  it('returns all vehicles in list order when no filters are supplied', async () => {
    const response = await request(app)
      .get('/api/vehicles/search')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(5);
    expect(response.body.map((vehicle: { make: string }) => vehicle.make)).toEqual([
      '100% Auto',
      'Ford',
      'Honda',
      'Honda',
      'Toyota',
    ]);
  });

  it.each([
    ['make substring case-insensitively', '?make=hon', ['Honda', 'Honda']],
    ['model substring case-insensitively', '?model=CIV', ['Honda']],
    ['category exactly case-insensitively', '?category=SEDAN', ['Honda', 'Toyota']],
    ['inclusive minimum price', '?minPrice=32000', ['Ford', 'Honda']],
    ['inclusive maximum price', '?maxPrice=21000', ['100% Auto', 'Honda', 'Toyota']],
    ['a composed AND filter', '?make=hon&category=suv&minPrice=32000', ['Honda']],
  ])('applies %s', async (_case, query, expectedMakes) => {
    const response = await request(app)
      .get(`/api/vehicles/search${query}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.map((vehicle: { make: string }) => vehicle.make)).toEqual(expectedMakes);
  });

  it('ignores blank filter values', async () => {
    const response = await request(app)
      .get('/api/vehicles/search?make=%20%20&model=&category=%20')
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(5);
  });

  it.each([
    ['make', '%', '100% Auto'],
    ['model', '_', '100% Auto'],
  ])('treats wildcard characters in %s literally', async (field, wildcard, expectedMake) => {
    const response = await request(app)
      .get(`/api/vehicles/search?${field}=${encodeURIComponent(wildcard)}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.map((vehicle: { make: string }) => vehicle.make)).toEqual([expectedMake]);
  });

  it('returns no matches for an injection-like make value', async () => {
    const response = await request(app)
      .get('/api/vehicles/search')
      .query({ make: "' OR 1=1 --" })
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it.each([
    ['an unknown query parameter', '?colour=red'],
    ['a non-numeric minimum price', '?minPrice=cheap'],
    ['a negative maximum price', '?maxPrice=-1'],
    ['an inverted price range', '?minPrice=20000&maxPrice=10000'],
  ])('rejects %s as 400 VALIDATION_ERROR', async (_case, query) => {
    const response = await request(app)
      .get(`/api/vehicles/search${query}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: expect.any(String) },
    });
  });
});
