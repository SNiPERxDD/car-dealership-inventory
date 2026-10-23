import { Router } from 'express';
import type pg from 'pg';
import { HttpError } from './middleware/errors.js';

/** `GET /health`: confirms the API is serving and the database answers a trivial query. */
export function createHealthRouter(pool: pg.Pool): Router {
  const router = Router();
  router.get('/health', async (_request, response) => {
    try {
      await pool.query('SELECT 1');
    } catch {
      throw new HttpError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable');
    }
    response.json({ status: 'ok', database: 'up' });
  });
  return router;
}
