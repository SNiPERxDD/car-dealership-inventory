import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../../db/migrate.js';
import { createPool } from '../../src/server/db/pool.js';

const pool = createPool(process.env.DATABASE_URL);
const table = 'probe_schema_migrations';
const fixtures = path.resolve('tests/db/fixtures/migrations');

async function resetProbeObjects(): Promise<void> {
  await pool.query(`DROP TABLE IF EXISTS ${table}, migrate_probe, migrate_probe_failing`);
}

beforeEach(resetProbeObjects);

afterAll(async () => {
  await resetProbeObjects();
  await pool.end();
});

async function appliedNames(): Promise<string[]> {
  const result = await pool.query<{ name: string }>(`SELECT name FROM ${table} ORDER BY name`);
  return result.rows.map((row) => row.name);
}

describe('runMigrations', () => {
  it('applies pending files in name order and records each one', async () => {
    const applied = await runMigrations({ pool, directory: path.join(fixtures, 'ordered'), table });

    expect(applied).toEqual(['001_create_probe.sql', '002_insert_probe.sql']);
    expect(await appliedNames()).toEqual(applied);
    const probe = await pool.query('SELECT id FROM migrate_probe');
    expect(probe.rows).toEqual([{ id: 1 }]);
  });

  it('is idempotent: a second run applies nothing', async () => {
    await runMigrations({ pool, directory: path.join(fixtures, 'ordered'), table });

    const secondRun = await runMigrations({
      pool,
      directory: path.join(fixtures, 'ordered'),
      table,
    });

    expect(secondRun).toEqual([]);
    const probe = await pool.query('SELECT id FROM migrate_probe');
    expect(probe.rowCount).toBe(1);
  });

  it('rolls back a failing file without recording it and keeps earlier files', async () => {
    await expect(
      runMigrations({ pool, directory: path.join(fixtures, 'failing'), table }),
    ).rejects.toThrow(/002_broken\.sql/);

    expect(await appliedNames()).toEqual(['001_create_probe.sql']);
    const probe = await pool.query('SELECT count(*)::int AS count FROM migrate_probe_failing');
    expect(probe.rows[0]).toEqual({ count: 0 });
  });
});
