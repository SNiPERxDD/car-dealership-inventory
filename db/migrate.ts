import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type pg from 'pg';
import { createPool } from '../src/server/db/pool.js';

export interface MigrationOptions {
  pool: pg.Pool;
  /** Directory of `.sql` files, applied in file-name order. */
  directory: string;
  /** Bookkeeping table name; overridable so tests stay isolated from the real schema. */
  table?: string;
}

const IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

/**
 * Applies pending SQL migrations, each in its own transaction, and records them by file name.
 * A session advisory lock serialises concurrent runs. A failing file is rolled back and the run
 * stops, leaving earlier files applied.
 *
 * @returns Names of the files applied by this run.
 */
export async function runMigrations({
  pool,
  directory,
  table = 'schema_migrations',
}: MigrationOptions): Promise<string[]> {
  if (!IDENTIFIER.test(table)) {
    throw new Error(`Invalid migrations table name: ${table}`);
  }
  const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [table]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS ${table} (
         name text PRIMARY KEY,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const existing = await client.query<{ name: string }>(`SELECT name FROM ${table}`);
    const done = new Set(existing.rows.map((row) => row.name));

    const applied: string[] = [];
    for (const name of files.filter((file) => !done.has(file))) {
      const sql = await readFile(path.join(directory, name), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(`INSERT INTO ${table} (name) VALUES ($1)`, [name]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Migration ${name} failed: ${reason}`, { cause: error });
      }
      applied.push(name);
    }
    return applied;
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [table]).catch(() => undefined);
    client.release();
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const pool = createPool(process.env.DATABASE_URL, 1);
  try {
    const applied = await runMigrations({ pool, directory: path.resolve('db/migrations') });
    console.log(applied.length ? `Applied: ${applied.join(', ')}` : 'No pending migrations.');
  } finally {
    await pool.end();
  }
}
