import { createApp } from './app.js';
import { createPool } from './db/pool.js';

const port = Number(process.env.PORT ?? 3001);
const app = createApp({ pool: createPool(process.env.DATABASE_URL) });

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
