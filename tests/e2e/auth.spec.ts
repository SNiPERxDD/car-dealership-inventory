import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { test, expect, signInThroughForm } from './fixtures/index.js';
import { jwtSecret } from './fixtures/environment.js';

const userPassword = `p6-auth-${randomUUID()}`;

test('registers an account, signs out, and clears the browser session', async ({ page }) => {
  const email = `p6-register-${randomUUID()}@example.test`;
  const password = `p6-register-${randomUUID()}`;
  await page.goto('/');
  await page
    .getByRole('group', { name: 'Account access' })
    .getByRole('button', {
      name: 'Create account',
    })
    .click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.locator('form').getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Inventory' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('car.session'))).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('car.session.user'))).toBeNull();
});

test('logs in through the form and logout clears both stored session values', async ({
  page,
  user,
}) => {
  await signInThroughForm(page, user.email, user.password);
  await page.getByRole('button', { name: 'Sign out' }).click();

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('car.session'))).toBeNull();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('car.session.user'))).toBeNull();
});

test('shows the server message for invalid credentials', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Email').fill(`missing-${randomUUID()}@example.test`);
  await page.getByLabel('Password').fill(userPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText('Email or password is incorrect');
});

test('expired sessions return to sign-in with an expiry message', async ({ page }) => {
  test.skip(!jwtSecret, 'E2E_JWT_SECRET is unset; cannot sign a server-verifiable expired token.');
  if (!jwtSecret) return;
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ role: 'user' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject('00000000-0000-4000-8000-000000000001')
    .setIssuedAt(now - 120)
    .setExpirationTime(now - 60)
    .sign(new TextEncoder().encode(jwtSecret));

  await page.addInitScript(
    ({ expiredToken }) => {
      localStorage.setItem('car.session', expiredToken);
      localStorage.setItem(
        'car.session.user',
        JSON.stringify({
          id: '00000000-0000-4000-8000-000000000001',
          email: 'expired@example.test',
          role: 'user',
        }),
      );
    },
    { expiredToken: token },
  );
  await page.goto('/');

  await expect(page.getByRole('alert')).toHaveText('Your session expired. Sign in again.');
});

test('corrupted sessions return to sign-in with an expiry message', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('car.session', 'corrupted.token.value');
    localStorage.setItem(
      'car.session.user',
      JSON.stringify({
        id: '00000000-0000-4000-8000-000000000001',
        email: 'bad@example.test',
        role: 'user',
      }),
    );
  });
  await page.goto('/');

  await expect(page.getByRole('alert')).toHaveText('Your session expired. Sign in again.');
});
