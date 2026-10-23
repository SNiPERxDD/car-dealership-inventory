import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createPool } from '../../src/server/db/pool.js';
import { resetVehicles } from '../support/vehicles.js';

const pool = createPool(process.env.DATABASE_URL);

beforeEach(async () => {
  await resetVehicles(pool);
});

afterAll(async () => {
  await pool.end();
});

/** Runs the demo inventory seed when the requested public export is present. */
async function runDemoInventorySeed(): Promise<boolean> {
  const seedModule = await import('../../db/seed.js');
  if (!('seedDemoInventory' in seedModule)) {
    expect('seedDemoInventory' in seedModule).toBe(true);
    return false;
  }
  await seedModule.seedDemoInventory({ pool });
  return true;
}

describe('seedDemoInventory', () => {
  it('inserts a fixed multi-category demo inventory including a zero-stock vehicle', async () => {
    if (!(await runDemoInventorySeed())) return;
    const vehicles = await pool.query<{ category: string; quantity: number }>(
      'SELECT category, quantity FROM vehicles',
    );

    expect(vehicles.rows).toHaveLength(10);
    expect(new Set(vehicles.rows.map((vehicle) => vehicle.category)).size).toBeGreaterThan(1);
    expect(vehicles.rows.some((vehicle) => vehicle.quantity === 0)).toBe(true);
  });

  it('does not duplicate demo inventory when run more than once', async () => {
    if (!(await runDemoInventorySeed())) return;
    const before = await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM vehicles',
    );
    await runDemoInventorySeed();
    const after = await pool.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM vehicles',
    );

    expect(after.rows[0].count).toBe(before.rows[0].count);
  });

  it('leaves existing inventory unchanged', async () => {
    const table = await pool.query("SELECT to_regclass('public.vehicles') AS vehicles_table");
    expect(table.rows[0]?.vehicles_table).toBe('vehicles');
    if (!table.rows[0]?.vehicles_table) return;
    await pool.query(
      'INSERT INTO vehicles (make, model, category, price, quantity) VALUES ($1, $2, $3, $4, $5)',
      ['Existing', 'Vehicle', 'sedan', 10, 1],
    );
    if (!(await runDemoInventorySeed())) return;
    const vehicles = await pool.query('SELECT make, model FROM vehicles');

    expect(vehicles.rows).toEqual([{ make: 'Existing', model: 'Vehicle' }]);
  });
});
