import { randomUUID } from 'node:crypto';
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { adminEmail, adminPassword, vercelBypassHeaders } from './environment.js';

export interface E2EUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export interface E2ESession {
  email: string;
  password: string;
  token: string;
  user: E2EUser;
}

export interface E2EVehicle {
  id: string;
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

export interface VehicleFields {
  make: string;
  model: string;
  category: string;
  price: number;
  quantity: number;
}

interface AuthResponse {
  token: string;
  user: E2EUser;
}

interface E2EFixtures {
  admin: E2ESession;
  user: E2ESession;
  vehicles: VehicleFactory;
}

export interface VehicleFactory {
  create(fields?: Partial<VehicleFields>): Promise<E2EVehicle>;
  track(vehicle: E2EVehicle): void;
}

/** Provides fresh API-authenticated user/admin sessions and cleans each test's vehicles. */
export const test = base.extend<E2EFixtures>({
  request: async ({ playwright, baseURL }, use) => {
    const request = vercelBypassHeaders
      ? await playwright.request.newContext({ baseURL, extraHTTPHeaders: vercelBypassHeaders })
      : await playwright.request.newContext({ baseURL });
    await use(request);
    await request.dispose();
  },
  admin: async ({ request }, use) => {
    const response = await request.post('/api/auth/login', {
      data: { email: adminEmail, password: adminPassword },
    });
    if (!response.ok()) {
      throw new Error(
        `Could not authenticate the configured E2E administrator (${response.status()}).`,
      );
    }
    const result = (await response.json()) as AuthResponse;
    if (result.user.role !== 'admin') {
      throw new Error('Configured E2E administrator credentials are not an administrator.');
    }
    await use({ ...result, email: adminEmail, password: adminPassword });
  },
  user: async ({ request }, use) => {
    const email = `p6-${randomUUID()}@example.test`;
    const password = `p6-user-${randomUUID()}`;
    const response = await request.post('/api/auth/register', { data: { email, password } });
    if (response.status() !== 201) {
      throw new Error(`Could not register an isolated E2E user (${response.status()}).`);
    }
    const result = (await response.json()) as AuthResponse;
    if (result.user.role !== 'user')
      throw new Error('Public registration did not create a user role.');
    await use({ ...result, email, password });
  },
  vehicles: async ({ request, admin }, use) => {
    const createdIds = new Set<string>();
    const factory: VehicleFactory = {
      create: async (overrides = {}) => {
        const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
        const fields: VehicleFields = {
          make: `P6 ${suffix}`,
          model: `E2E-${suffix}`,
          category: 'electric',
          price: 62500.25,
          quantity: 3,
          ...overrides,
        };
        const response = await request.post('/api/vehicles', {
          headers: authorization(admin.token),
          data: fields,
        });
        if (response.status() !== 201) {
          throw new Error(`Could not create an isolated E2E vehicle (${response.status()}).`);
        }
        const vehicle = (await response.json()) as E2EVehicle;
        createdIds.add(vehicle.id);
        return vehicle;
      },
      track: (vehicle) => createdIds.add(vehicle.id),
    };

    await use(factory);

    for (const id of createdIds) {
      const response = await request.delete(`/api/vehicles/${id}`, {
        headers: authorization(admin.token),
      });
      if (response.status() !== 204 && response.status() !== 404) {
        throw new Error(`Could not clean up E2E vehicle ${id} (${response.status()}).`);
      }
    }
  },
});

export { expect };

/** Adds the bearer authorization header expected by protected API routes. */
export function authorization(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Adds a session to one browser page and opens the authenticated inventory screen. */
export async function openAuthenticated(page: Page, session: E2ESession): Promise<void> {
  await page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('car.session', token);
      localStorage.setItem('car.session.user', JSON.stringify(user));
    },
    { token: session.token, user: session.user },
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
}

/** Signs in through the visible authentication form. */
export async function signInThroughForm(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
}

/** Lists vehicles with the supplied token and returns a fixture record by identifier. */
export async function readVehicle(
  request: APIRequestContext,
  token: string,
  id: string,
): Promise<E2EVehicle | undefined> {
  const response = await request.get('/api/vehicles', { headers: authorization(token) });
  return ((await response.json()) as E2EVehicle[]).find((vehicle) => vehicle.id === id);
}

/** Creates the unique fields used for a vehicle submitted through the UI. */
export function uniqueVehicleFields(): VehicleFields {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  return {
    make: `P6 ${suffix}`,
    model: `E2E-${suffix}`,
    category: 'electric',
    price: 62500.25,
    quantity: 3,
  };
}

/** Asserts the public error envelope and its HTTP status/code. */
export async function expectApiError(
  response: Awaited<ReturnType<APIRequestContext['get']>>,
  status: number,
  code: string,
): Promise<{ error: { code: string; message: string } }> {
  expect(response.status()).toBe(status);
  const body = (await response.json()) as { error: { code: string; message: string } };
  expect(body).toEqual({ error: { code, message: expect.any(String) } });
  return body;
}
