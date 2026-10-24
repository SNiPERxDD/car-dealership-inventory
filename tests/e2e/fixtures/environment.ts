import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd, env, loadEnvFile } from 'node:process';

const localEnvironmentPath = resolve(cwd(), '.env');
if (existsSync(localEnvironmentPath)) loadEnvFile(localEnvironmentPath);

/** Requires the configured administrator value without exposing its contents. */
function requiredAdminSetting(value: string | undefined, setting: string): string {
  if (!value) {
    throw new Error(
      `Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (or local ADMIN_EMAIL and ADMIN_PASSWORD) before running Playwright; missing ${setting}.`,
    );
  }
  return value;
}

export const adminEmail = requiredAdminSetting(
  env.E2E_ADMIN_EMAIL ?? env.ADMIN_EMAIL,
  'E2E_ADMIN_EMAIL/ADMIN_EMAIL',
);
export const adminPassword = requiredAdminSetting(
  env.E2E_ADMIN_PASSWORD ?? env.ADMIN_PASSWORD,
  'E2E_ADMIN_PASSWORD/ADMIN_PASSWORD',
);
export const jwtSecret = env.E2E_JWT_SECRET;

export const vercelBypassHeaders = env.VERCEL_AUTOMATION_BYPASS_SECRET
  ? {
      'x-vercel-protection-bypass': env.VERCEL_AUTOMATION_BYPASS_SECRET,
      'x-vercel-set-bypass-cookie': 'true',
    }
  : undefined;
