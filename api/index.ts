import { createApp } from '../src/server/app.js';
import { readJwtSecret } from '../src/server/config.js';
import { createPool } from '../src/server/db/pool.js';

// Vercel reuses this module across invocations, so the pool is created once per instance.
export default createApp({
  pool: createPool(process.env.DATABASE_URL),
  jwtSecret: readJwtSecret(),
});
