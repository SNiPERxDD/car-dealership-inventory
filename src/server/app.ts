import express from 'express';
import type pg from 'pg';

export interface AppDependencies {
  pool: pg.Pool;
}

export function createApp(_dependencies: AppDependencies): express.Express {
  return express();
}
