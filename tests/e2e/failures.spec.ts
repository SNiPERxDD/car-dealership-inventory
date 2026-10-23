import { test, expect, openAuthenticated } from './fixtures/index.js';

test('shows a clear error when inventory returns 500', async ({ page, user }) => {
  await page.route('**/api/vehicles', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'INTERNAL_ERROR', message: 'Inventory is temporarily unavailable.' },
        }),
      });
    } else {
      await route.continue();
    }
  });
  await openAuthenticated(page, user);

  await expect(page.getByRole('status')).toContainText('Inventory is temporarily unavailable.');
});

test('shows the network message when the inventory request is aborted', async ({ page, user }) => {
  await page.route('**/api/vehicles', async (route) => {
    if (route.request().method() === 'GET') await route.abort();
    else await route.continue();
  });
  await openAuthenticated(page, user);

  await expect(page.getByRole('status')).toContainText(
    'Could not reach the server. Check your connection and try again.',
  );
});

test('maps an out-of-stock conflict to clear purchase copy', async ({ page, user, vehicles }) => {
  const vehicle = await vehicles.create({ quantity: 1 });
  await page.route(`**/api/vehicles/${vehicle.id}/purchase`, async (route) => {
    await route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: 'OUT_OF_STOCK', message: 'Vehicle is out of stock' } }),
    });
  });
  await openAuthenticated(page, user);
  const sticker = page.locator('.vehicle-sticker').filter({ hasText: vehicle.model });
  await sticker.getByRole('button', { name: 'Purchase' }).click();

  await expect(page.getByRole('status')).toContainText(
    'None left in stock. The listing has been refreshed.',
  );
});

test('blocks invalid price and quantity in the client and shows server validation errors', async ({
  page,
  admin,
}) => {
  await openAuthenticated(page, admin);
  await page.getByRole('button', { name: 'Manage stock' }).click();
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.getByLabel('Make').fill('Validation test');
  await page.getByLabel('Model').fill('Invalid values');
  await page.getByLabel('Category').fill('sedan');
  await page.getByLabel('Price').fill('12.345');
  await page.getByLabel('Quantity').fill('1.5');
  let createRequests = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/vehicles') {
      createRequests += 1;
    }
  });
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Enter a price of 0 or more with no more than 2 decimal places.',
  );
  await page.getByLabel('Price').fill('12.34');
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  await expect(page.getByRole('alert')).toHaveText('Quantity must be a whole number of 0 or more.');
  expect(createRequests).toBe(0);

  await page.route('**/api/vehicles', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'VALIDATION_ERROR', message: 'Server rejected this vehicle.' },
        }),
      });
    } else {
      await route.continue();
    }
  });
  await page.getByLabel('Quantity').fill('1');
  await page.getByRole('button', { name: 'Save vehicle' }).click();

  await expect(page.getByRole('alert')).toHaveText('Server rejected this vehicle.');
});
