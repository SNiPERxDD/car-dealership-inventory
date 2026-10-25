import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPool } from '../../src/server/db/pool.js';

describe('createPool', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles an idle client error without throwing', async () => {
    const pool = createPool('postgres://car:car@localhost:5432/car_test');
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => pool.emit('error', new Error('idle client failed'))).not.toThrow();
    expect(errorLog).toHaveBeenCalledOnce();
    await pool.end();
  });
});
