import type pg from 'pg';

export interface MigrationOptions {
  pool: pg.Pool;
  directory: string;
  table?: string;
}

export async function runMigrations(_options: MigrationOptions): Promise<string[]> {
  return [];
}
