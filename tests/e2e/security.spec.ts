import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import {
  test,
  expect,
  authorization,
  expectApiError,
  openAuthenticated,
  readVehicle,
} from './fixtures/index.js';

const validVehicle = {
  make: 'Security fixture',
  model: 'Authorization boundary',
  category: 'sedan',
  price: 25000,
  quantity: 3,
};

test('user tokens cannot create, update, delete, or restock vehicles', async ({
  request,
  user,
  vehicles,
}) => {
  const vehicle = await vehicles.create();
  const headers = authorization(user.token);
  const responses = await Promise.all([
    request.post('/api/vehicles', { headers, data: validVehicle }),
    request.put(`/api/vehicles/${vehicle.id}`, { headers, data: validVehicle }),
    request.delete(`/api/vehicles/${vehicle.id}`, { headers }),
    request.post(`/api/vehicles/${vehicle.id}/restock`, { headers, data: { quantity: 1 } }),
  ]);

  for (const response of responses) await expectApiError(response, 403, 'FORBIDDEN');
  await expect
    .poll(() => readVehicle(request, user.token, vehicle.id))
    .toMatchObject({ ...vehicle });
});

test('missing and corrupted bearer tokens return 401 error envelopes', async ({ request }) => {
  const missing = await request.get('/api/vehicles');
  const corrupted = await request.get('/api/vehicles', {
    headers: { Authorization: 'Bearer corrupted.token.value' },
  });

  await expectApiError(missing, 401, 'UNAUTHENTICATED');
  await expectApiError(corrupted, 401, 'INVALID_TOKEN');
});

test('a validly shaped token signed with the wrong secret returns INVALID_TOKEN', async ({
  request,
}) => {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(randomUUID())
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('wrong-e2e-signing-secret-with-adequate-length'));
  const response = await request.get('/api/vehicles', {
    headers: authorization(token),
  });

  await expectApiError(response, 401, 'INVALID_TOKEN');
});

test('public registration rejects an attempted administrator role escalation', async ({
  request,
}) => {
  const response = await request.post('/api/auth/register', {
    data: {
      email: `p6-role-${randomUUID()}@example.test`,
      password: `p6-role-${randomUUID()}`,
      role: 'admin',
    },
  });

  await expectApiError(response, 400, 'VALIDATION_ERROR');
});

test('unexpected id and purchase quantity fields are rejected without changing inventory', async ({
  request,
  admin,
  user,
  vehicles,
}) => {
  const vehicle = await vehicles.create();
  const createWithId = await request.post('/api/vehicles', {
    headers: authorization(admin.token),
    data: { ...validVehicle, id: randomUUID() },
  });
  const purchaseWithQuantity = await request.post(`/api/vehicles/${vehicle.id}/purchase`, {
    headers: authorization(user.token),
    data: { quantity: 99 },
  });

  await expectApiError(createWithId, 400, 'VALIDATION_ERROR');
  await expectApiError(purchaseWithQuantity, 400, 'VALIDATION_ERROR');
  await expect
    .poll(() => readVehicle(request, admin.token, vehicle.id))
    .toMatchObject({ ...vehicle });
});

test('SQL-injection-like search text is treated as a literal value', async ({ request, user }) => {
  const input = "' OR 1=1 --";
  const response = await request.get(`/api/vehicles/search?make=${encodeURIComponent(input)}`, {
    headers: authorization(user.token),
  });

  expect(response.status()).toBe(200);
  const vehicles = (await response.json()) as Array<{ make: string }>;
  expect(Array.isArray(vehicles)).toBe(true);
  expect(
    vehicles.every((vehicle) => vehicle.make.toLowerCase().includes(input.toLowerCase())),
  ).toBe(true);
});

test('renders XSS-like vehicle text without executing it', async ({ page, admin, vehicles }) => {
  const maliciousMake = '<img src=x onerror=alert(1)>';
  const vehicle = await vehicles.create({ make: maliciousMake });
  let dialogShown = false;
  page.on('dialog', async (dialog) => {
    dialogShown = true;
    await dialog.dismiss();
  });
  await openAuthenticated(page, admin);
  const sticker = page.locator('.vehicle-sticker').filter({ hasText: vehicle.model });

  await expect(sticker.locator('.sticker-make')).toHaveText(maliciousMake);
  await expect(sticker.locator('img')).toHaveCount(0);
  expect(dialogShown).toBe(false);
});

test('error responses expose only the public envelope, not stack or SQL details', async ({
  request,
  admin,
}) => {
  const response = await request.post('/api/vehicles', {
    headers: { ...authorization(admin.token), 'Content-Type': 'application/json' },
    data: '{',
  });
  const error = await expectApiError(response, 400, 'INVALID_JSON');
  const body = JSON.stringify(error);

  expect(body).not.toMatch(/\b(?:SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b/i);
  expect(body).not.toMatch(/\bat\s+[^\n]+:\d+:\d+/);
});

test('concurrent purchases of the last unit sell exactly once', async ({
  request,
  user,
  vehicles,
}) => {
  const vehicle = await vehicles.create({ quantity: 1 });
  const responses = await Promise.all(
    Array.from({ length: 20 }, () =>
      request.post(`/api/vehicles/${vehicle.id}/purchase`, {
        headers: authorization(user.token),
      }),
    ),
  );
  const successful = responses.filter((response) => response.status() === 200);
  const conflicts = responses.filter((response) => response.status() === 409);

  expect(successful).toHaveLength(1);
  expect(conflicts).toHaveLength(19);
  for (const response of conflicts) await expectApiError(response, 409, 'OUT_OF_STOCK');
  await expect
    .poll(() => readVehicle(request, user.token, vehicle.id))
    .toMatchObject({ ...vehicle, quantity: 0 });
});

test('admin restock overflow returns STOCK_LIMIT_EXCEEDED without changing quantity', async ({
  request,
  admin,
  vehicles,
}) => {
  const vehicle = await vehicles.create({ quantity: 2147483646 });
  const response = await request.post(`/api/vehicles/${vehicle.id}/restock`, {
    headers: authorization(admin.token),
    data: { quantity: 2 },
  });

  await expectApiError(response, 409, 'STOCK_LIMIT_EXCEEDED');
  await expect
    .poll(() => readVehicle(request, admin.token, vehicle.id))
    .toMatchObject({ ...vehicle, quantity: 2147483646 });
});
