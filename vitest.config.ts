import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const testDatabaseUrl = env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL is required to run tests (see .env.example).');
  }
  // Global setup runs in the main process, so the test URL is exported there as well.
  process.env.DATABASE_URL = testDatabaseUrl;
  return {
    test: {
      environment: 'node',
      include: [
        'tests/api/**/*.test.ts',
        'tests/db/**/*.test.ts',
        'tests/unit/**/*.test.ts',
        'tests/web/**/*.test.tsx',
      ],
      testTimeout: 15_000,
      env: { DATABASE_URL: testDatabaseUrl },
      globalSetup: ['tests/setup/global-setup.ts'],
      fileParallelism: false,
    },
  };
});
