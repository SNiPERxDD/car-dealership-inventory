import type pg from 'pg';

export interface VehicleFixture {
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

/** Clears vehicle rows before each integration test. */
export async function resetVehicles(pool: pg.Pool): Promise<void> {
  await pool.query('TRUNCATE vehicles RESTART IDENTITY CASCADE');
}

/** Inserts parameterized vehicle rows used by HTTP search integration tests. */
export async function insertVehicleFixtures(
  pool: pg.Pool,
  vehicles: [VehicleFixture, ...VehicleFixture[]],
): Promise<[string, ...string[]]> {
  const [firstVehicle, ...remainingVehicles] = vehicles;
  const ids: [string, ...string[]] = [await insertVehicleFixture(pool, firstVehicle)];
  for (const vehicle of remainingVehicles) {
    ids.push(await insertVehicleFixture(pool, vehicle));
  }
  return ids;
}

/** Inserts one parameterized vehicle fixture and returns its generated identifier. */
async function insertVehicleFixture(pool: pg.Pool, vehicle: VehicleFixture): Promise<string> {
  const result = await pool.query<{ id: string }>(
    'INSERT INTO vehicles (make, model, category, price, quantity) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [vehicle.make, vehicle.model, vehicle.category, vehicle.price, vehicle.quantity],
  );
  return result.rows[0]!.id;
}
