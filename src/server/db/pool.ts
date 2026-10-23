import pg from 'pg';

/**
 * Creates a PostgreSQL connection pool.
 *
 * Serverless deployments connect through Supabase's transaction pooler, so the pool stays small
 * and queries never use named prepared statements.
 *
 * @param connectionString - PostgreSQL URL; required.
 * @param max - Maximum open connections, from `PG_POOL_MAX` when not given.
 */
export function createPool(
  connectionString: string | undefined,
  max = Number(process.env.PG_POOL_MAX ?? 5),
): pg.Pool {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }
  return new pg.Pool({ connectionString, max, connectionTimeoutMillis: 5_000 });
}
