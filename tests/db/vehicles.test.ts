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

describe('vehicles storage', () => {
  it('creates vehicles with generated UUID identifiers', async () => {
    const result = await pool.query(
      `INSERT INTO vehicles (make, model, category, price, quantity)
       VALUES ('Honda', 'Civic', 'sedan', 19999.99, 2), ('Honda', 'Civic', 'sedan', 19999.99, 2)
       RETURNING id`,
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(result.rows[0].id).not.toBe(result.rows[1].id);
  });

  it('stores vehicle fields with the specified PostgreSQL types and defaults', async () => {
    const result = await pool.query(
      `SELECT column_name, data_type, numeric_precision, numeric_scale, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'vehicles'`,
    );
    const columns = new Map(
      result.rows.map(
        (column: {
          column_name: string;
          data_type: string;
          numeric_precision: number | null;
          numeric_scale: number | null;
          is_nullable: string;
        }) => [column.column_name, column],
      ),
    );

    expect(columns.get('id')).toMatchObject({ data_type: 'uuid', is_nullable: 'NO' });
    expect(columns.get('make')).toMatchObject({ data_type: 'text', is_nullable: 'NO' });
    expect(columns.get('model')).toMatchObject({ data_type: 'text', is_nullable: 'NO' });
    expect(columns.get('category')).toMatchObject({ data_type: 'text', is_nullable: 'NO' });
    expect(columns.get('price')).toMatchObject({
      data_type: 'numeric',
      numeric_precision: 12,
      numeric_scale: 2,
      is_nullable: 'NO',
    });
    expect(columns.get('quantity')).toMatchObject({ data_type: 'integer', is_nullable: 'NO' });
    expect(columns.get('created_at')).toMatchObject({ data_type: 'timestamp with time zone' });
    expect(columns.get('updated_at')).toMatchObject({ data_type: 'timestamp with time zone' });
  });

  it('enables row-level security on vehicles', async () => {
    const result = await pool.query(
      "SELECT relrowsecurity FROM pg_class WHERE oid = 'public.vehicles'::regclass",
    );

    expect(result.rows[0].relrowsecurity).toBe(true);
  });

  it('rejects a negative vehicle price', async () => {
    await expect(
      pool.query(
        'INSERT INTO vehicles (make, model, category, price, quantity) VALUES ($1, $2, $3, $4, $5)',
        ['Honda', 'Civic', 'sedan', -1, 2],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('rejects a negative vehicle quantity', async () => {
    await expect(
      pool.query(
        'INSERT INTO vehicles (make, model, category, price, quantity) VALUES ($1, $2, $3, $4, $5)',
        ['Honda', 'Civic', 'sedan', 100, -1],
      ),
    ).rejects.toMatchObject({ code: '23514' });
  });
});
