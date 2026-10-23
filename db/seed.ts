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

export interface SeedDemoInventoryOptions {
  pool: pg.Pool;
}

const DEMO_VEHICLES = [
  { make: 'Honda', model: 'Civic', category: 'sedan', price: 24999.99, quantity: 6 },
  { make: 'Honda', model: 'CR-V', category: 'suv', price: 32999.99, quantity: 4 },
  { make: 'Toyota', model: 'Corolla', category: 'sedan', price: 23999.99, quantity: 8 },
  { make: 'Toyota', model: 'RAV4', category: 'suv', price: 34999.99, quantity: 5 },
  { make: 'Ford', model: 'F-150', category: 'truck', price: 42999.99, quantity: 3 },
  { make: 'Ford', model: 'Mustang', category: 'coupe', price: 39999.99, quantity: 2 },
  { make: 'Chevrolet', model: 'Bolt', category: 'electric', price: 27999.99, quantity: 0 },
  { make: 'Chevrolet', model: 'Silverado', category: 'truck', price: 41999.99, quantity: 1 },
  { make: 'Hyundai', model: 'Elantra', category: 'sedan', price: 21999.99, quantity: 7 },
  { make: 'Tesla', model: 'Model 3', category: 'electric', price: 38999.99, quantity: 2 },
] as const;

/** Creates or updates the seeded administrator using the shared auth schema and password hash. */
export async function seedAdmin({ pool, email, password }: SeedAdminOptions): Promise<void> {
  const credentials = credentialsSchema.parse({ email, password });
  const passwordHash = await hashPassword(credentials.password);
  await new UserRepository(pool).upsertAdmin(credentials.email, passwordHash);
}

/** Inserts the fixed demo inventory only when no vehicles exist. */
export async function seedDemoInventory({ pool }: SeedDemoInventoryOptions): Promise<void> {
  const existingVehicles = await pool.query<{ has_vehicles: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM vehicles) AS has_vehicles',
  );
  if (existingVehicles.rows[0]?.has_vehicles) return;

  const parameters = DEMO_VEHICLES.flatMap((vehicle) => [
    vehicle.make,
    vehicle.model,
    vehicle.category,
    vehicle.price,
    vehicle.quantity,
  ]);
  const values = DEMO_VEHICLES.map((_, index) => {
    const offset = index * 5;
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
  });
  await pool.query(
    `INSERT INTO vehicles (make, model, category, price, quantity) VALUES ${values.join(', ')}`,
    parameters,
  );
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
    await seedDemoInventory({ pool });
    console.log('Seed completed.');
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
