import {
  test,
  expect,
  openAuthenticated,
  readVehicle,
  signInThroughForm,
  uniqueVehicleFields,
} from './fixtures/index.js';

/** Opens the administrator's stock manager through the browser UI. */
async function openStockManager(
  page: import('@playwright/test').Page,
  admin: {
    email: string;
    password: string;
    token: string;
    user: { id: string; email: string; role: 'user' | 'admin' };
  },
): Promise<void> {
  await openAuthenticated(page, admin);
  await page.getByRole('button', { name: 'Manage stock' }).click();
  await expect(page.getByRole('heading', { name: 'Manage stock' })).toBeVisible();
}

test('adds a vehicle through the UI and verifies the persisted record', async ({
  page,
  admin,
  request,
  vehicles,
}) => {
  const fields = uniqueVehicleFields();
  await openStockManager(page, admin);
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.getByLabel('Make').fill(fields.make);
  await page.getByLabel('Model').fill(fields.model);
  await page.getByLabel('Category').fill(fields.category);
  await page.getByLabel('Price').fill(String(fields.price));
  await page.getByLabel('Quantity').fill(String(fields.quantity));
  await page.getByRole('button', { name: 'Save vehicle' }).click();

  await expect(page.getByRole('status')).toContainText('Vehicle added to the lot.');
  const response = await request.get('/api/vehicles', {
    headers: { Authorization: `Bearer ${admin.token}` },
  });
  const created = ((await response.json()) as Array<typeof fields & { id: string }>).find(
    (vehicle) => vehicle.model === fields.model,
  );
  expect(created).toMatchObject({ ...fields });
  if (!created) throw new Error('The created vehicle was not returned by the authenticated API.');
  vehicles.track(created);
});

test('edits a vehicle and verifies the full replacement in the API', async ({
  page,
  admin,
  request,
  vehicles,
}) => {
  const vehicle = await vehicles.create();
  await openStockManager(page, admin);
  const row = page.getByRole('row').filter({ hasText: vehicle.model });
  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Price').fill('73450.25');
  await page.getByRole('button', { name: 'Save vehicle' }).click();

  await expect(page.getByRole('status')).toContainText('Vehicle details updated.');
  await expect
    .poll(() => readVehicle(request, admin.token, vehicle.id))
    .toMatchObject({ ...vehicle, price: 73450.25 });
});

test('restocks a vehicle and verifies the new quantity through the API', async ({
  page,
  admin,
  request,
  vehicles,
}) => {
  const vehicle = await vehicles.create({ quantity: 2 });
  await openStockManager(page, admin);
  const row = page.getByRole('row').filter({ hasText: vehicle.model });
  await row.getByRole('button', { name: 'Restock' }).click();
  await page.getByLabel('Quantity to restock').fill('4');
  await page.getByRole('button', { name: 'Restock vehicle' }).click();

  await expect(page.getByRole('status')).toContainText(
    `Restocked 4 × ${vehicle.make} ${vehicle.model}.`,
  );
  await expect
    .poll(() => readVehicle(request, admin.token, vehicle.id))
    .toMatchObject({ ...vehicle, quantity: 6 });
});

test('confirms deletion inline and verifies the record is gone', async ({
  page,
  admin,
  request,
  vehicles,
}) => {
  const vehicle = await vehicles.create();
  await openStockManager(page, admin);
  const row = page.getByRole('row').filter({ hasText: vehicle.model });
  await row.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    row.getByText(`Delete ${vehicle.make}? This removes it from the lot.`),
  ).toBeVisible();
  await row.getByRole('button', { name: 'Delete vehicle' }).click();

  await expect(page.getByRole('status')).toContainText('Vehicle removed from the lot.');
  await expect.poll(() => readVehicle(request, admin.token, vehicle.id)).toBeUndefined();
});

test('does not show stock management to a normal user', async ({ page, user }) => {
  await signInThroughForm(page, user.email, user.password);

  await expect(page.getByRole('button', { name: 'Manage stock' })).toHaveCount(0);
});
