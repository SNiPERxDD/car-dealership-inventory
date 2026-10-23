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
  vehicles: VehicleFixture[],
): Promise<string[]> {
  const ids: string[] = [];
  for (const vehicle of vehicles) {
    const result = await pool.query<{ id: string }>(
      'INSERT INTO vehicles (make, model, category, price, quantity) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [vehicle.make, vehicle.model, vehicle.category, vehicle.price, vehicle.quantity],
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}
