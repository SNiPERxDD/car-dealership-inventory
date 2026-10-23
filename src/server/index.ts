import { createApp } from './app.js';
import { readJwtSecret } from './config.js';
import { createPool } from './db/pool.js';

const port = Number(process.env.PORT ?? 3001);
const app = createApp({ pool: createPool(process.env.DATABASE_URL), jwtSecret: readJwtSecret() });

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
