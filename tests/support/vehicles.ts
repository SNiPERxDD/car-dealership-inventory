import type pg from 'pg';

export interface VehicleFixture {
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

/** Clears vehicle rows when the P3 table exists, keeping RED setup assertion-driven. */
export async function resetVehicles(pool: pg.Pool): Promise<void> {
  const table = await pool.query("SELECT to_regclass('public.vehicles') AS vehicles_table");
  if (table.rows[0]?.vehicles_table) {
    await pool.query('TRUNCATE vehicles RESTART IDENTITY CASCADE');
  }
}

/** Seeds HTTP search fixtures when the vehicle table exists; absent P3 storage leaves RED to HTTP. */
export async function insertVehicleFixtures(
  pool: pg.Pool,
  vehicles: VehicleFixture[],
): Promise<void> {
  const table = await pool.query("SELECT to_regclass('public.vehicles') AS vehicles_table");
  if (!table.rows[0]?.vehicles_table) return;

  for (const vehicle of vehicles) {
    await pool.query(
      'INSERT INTO vehicles (make, model, category, price, quantity) VALUES ($1, $2, $3, $4, $5)',
      [vehicle.make, vehicle.model, vehicle.category, vehicle.price, vehicle.quantity],
    );
  }
}
