import path from 'node:path';
import { createPool } from '../../src/server/db/pool.js';
import { runMigrations } from '../../db/migrate.js';

/** Applies the real schema to the test database once before the suite runs. */
export default async function globalSetup(): Promise<void> {
  const pool = createPool(process.env.DATABASE_URL);
  try {
    await runMigrations({ pool, directory: path.resolve('db/migrations') });
  } finally {
    await pool.end();
  }
}
