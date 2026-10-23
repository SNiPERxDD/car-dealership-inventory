import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type pg from 'pg';
import { hashPassword } from '../src/server/auth/auth-service.js';
import { credentialsSchema } from '../src/server/auth/schemas.js';
import { UserRepository } from '../src/server/auth/user-repository.js';
import { createPool } from '../src/server/db/pool.js';

export interface SeedAdminOptions {
  pool: pg.Pool;
  email: string;
  password: string;
}

/** Creates or updates the seeded administrator using the shared auth schema and password hash. */
export async function seedAdmin({ pool, email, password }: SeedAdminOptions): Promise<void> {
  const credentials = credentialsSchema.parse({ email, password });
  const passwordHash = await hashPassword(credentials.password);
  await new UserRepository(pool).upsertAdmin(credentials.email, passwordHash);
}

/** Runs the admin seed from local environment variables without printing credentials. */
async function runSeedCommand(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must both be set to seed an administrator.');
  }
  const pool = createPool(process.env.DATABASE_URL, 1);
  try {
    await seedAdmin({ pool, email, password });
    console.log('Administrator account seeded.');
  } finally {
    await pool.end();
  }
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (invokedDirectly) {
  try {
    await runSeedCommand();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Administrator seeding failed.');
    process.exitCode = 1;
  }
}
