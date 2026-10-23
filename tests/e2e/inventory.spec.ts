import { test, expect, openAuthenticated } from './fixtures/index.js';

/** Expands the mobile-only filter disclosure when it is visible. */
async function openFiltersIfCollapsed(page: import('@playwright/test').Page): Promise<void> {
  const summary = page.locator('.filter-rail > summary');
  if (await summary.isVisible()) await summary.click();
}

test('lists the isolated fixture vehicle', async ({ page, admin, vehicles }) => {
  const vehicle = await vehicles.create();
  await openAuthenticated(page, admin);

  await expect(page.locator('.vehicle-sticker').filter({ hasText: vehicle.model })).toBeVisible();
});

test('searches by make, model, and category', async ({ page, admin, vehicles }) => {
  const vehicle = await vehicles.create();
  await openAuthenticated(page, admin);
  await openFiltersIfCollapsed(page);
  await page.getByLabel('Make').fill(vehicle.make);
  await page.getByLabel('Model').fill(vehicle.model);
  await page.getByLabel('Category').fill(vehicle.category);
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.locator('.vehicle-sticker').filter({ hasText: vehicle.model })).toBeVisible();
  await expect(page.locator('.vehicle-sticker')).toHaveCount(1);
});

test('filters by a price range', async ({ page, admin, vehicles }) => {
  const vehicle = await vehicles.create({ price: 67890.12 });
  await openAuthenticated(page, admin);
  await openFiltersIfCollapsed(page);
  await page.getByLabel('Minimum price').fill('67000');
  await page.getByLabel('Maximum price').fill('68000');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.locator('.vehicle-sticker').filter({ hasText: vehicle.model })).toBeVisible();
  await expect(page.locator('.vehicle-sticker')).toHaveCount(1);
});

test('clears search filters and restores the isolated vehicle', async ({
  page,
  admin,
  vehicles,
}) => {
  const vehicle = await vehicles.create();
  await openAuthenticated(page, admin);
  await openFiltersIfCollapsed(page);
  await page.getByLabel('Make').fill(vehicle.make);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.locator('.vehicle-sticker')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear filters' }).click();

  await expect(page.locator('.vehicle-sticker').filter({ hasText: vehicle.model })).toBeVisible();
});

test('purchase decrements the stock odometer and shows a success message', async ({
  page,
  user,
  vehicles,
}) => {
  const vehicle = await vehicles.create({ quantity: 2 });
  await openAuthenticated(page, user);
  const sticker = page.locator('.vehicle-sticker').filter({ hasText: vehicle.model });
  await sticker.getByRole('button', { name: 'Purchase' }).click();

  await expect(sticker.getByLabel('1 in stock')).toBeVisible();
  await expect(page.getByRole('status')).toContainText(
    `Purchased 1 × ${vehicle.make} ${vehicle.model}.`,
  );
});

test('zero-stock stickers disable purchase and say out of stock', async ({
  page,
  user,
  vehicles,
}) => {
  const vehicle = await vehicles.create({ quantity: 0 });
  await openAuthenticated(page, user);
  const sticker = page.locator('.vehicle-sticker').filter({ hasText: vehicle.model });

  await expect(sticker.getByRole('button', { name: 'Purchase' })).toBeDisabled();
  await expect(sticker.getByText('Out of stock')).toBeVisible();
});

test('purchasing the last unit changes the sticker to sold out', async ({
  page,
  user,
  vehicles,
}) => {
  const vehicle = await vehicles.create({ quantity: 1 });
  await openAuthenticated(page, user);
  const sticker = page.locator('.vehicle-sticker').filter({ hasText: vehicle.model });
  await sticker.getByRole('button', { name: 'Purchase' }).click();

  await expect(sticker.getByLabel('0 in stock')).toBeVisible();
  await expect(sticker.getByRole('button', { name: 'Purchase' })).toBeDisabled();
  await expect(sticker.getByText('Sold out')).toBeVisible();
});
