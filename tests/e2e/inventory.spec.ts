import { randomUUID } from 'node:crypto';
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
  await page.getByRole('spinbutton', { name: 'Minimum price' }).fill('67000');
  await page.getByRole('spinbutton', { name: 'Maximum price' }).fill('68000');
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
  await expect(page.getByRole('status')).toContainText('Purchased 1 ×');
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

test('visible inventory, auth, and admin controls are at least 44px tall on mobile', async ({
  page,
  user,
  admin,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const assertTapTargets = async (hasSliders = false) => {
    const shortTargets = await page
      .locator('button:visible, input:visible, select:visible, summary:visible')
      .evaluateAll((elements) =>
        elements
          .map((element) => ({
            label:
              element.getAttribute('aria-label') ||
              element.textContent?.trim() ||
              element.tagName.toLowerCase(),
            height: element.getBoundingClientRect().height,
          }))
          .filter(({ height }) => height < 44),
      );
    expect(shortTargets).toEqual([]);

    if (hasSliders) {
      const sliders = page.getByRole('slider');
      await expect(sliders).toHaveCount(2);
      const shortThumbs = await sliders.evaluateAll((elements) =>
        elements
          .map((element) =>
            Number.parseFloat(getComputedStyle(element, '::-webkit-slider-thumb').height),
          )
          .filter((height) => height < 44),
      );
      expect(shortThumbs).toEqual([]);
    }
  };

  await openAuthenticated(page, user);
  await openFiltersIfCollapsed(page);
  await assertTapTargets(true);

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await assertTapTargets();

  await page.getByLabel('Email').fill(admin.email);
  await page.getByLabel('Password').fill(admin.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Manage stock' }).click();
  await expect(page.getByRole('heading', { name: 'Manage stock' })).toBeVisible();
  await assertTapTargets();
});

test('delete confirmation preserves column widths at 1280px', async ({ page, admin, vehicles }) => {
  await vehicles.create();
  await page.setViewportSize({ width: 1280, height: 900 });
  await openAuthenticated(page, admin);
  await page.getByRole('button', { name: 'Manage stock' }).click();
  const row = page
    .getByRole('row')
    .filter({ has: page.getByRole('button', { name: 'Delete' }) })
    .last();
  await expect(row).toBeVisible();
  const widthsBefore = await row
    .locator('td')
    .evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));

  await row.getByRole('button', { name: 'Delete', exact: true }).click();

  const widthsAfter = await row
    .locator('td')
    .evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
  expect(widthsAfter).toEqual(widthsBefore);
});

test('the last inventory card action stays reachable while a toast is shown', async ({
  page,
  admin,
  vehicles,
}) => {
  const make = `ZZZ UIFIX ${randomUUID()}`;
  for (let index = 0; index < 6; index += 1) {
    await vehicles.create({ make, model: `UIFIX-${String(index).padStart(2, '0')}`, quantity: 3 });
  }
  await openAuthenticated(page, admin);
  const firstCard = page.locator('.vehicle-sticker').filter({ hasText: make }).first();
  await firstCard.getByRole('button', { name: 'Purchase' }).click();
  await expect(page.getByRole('status')).toContainText('Purchased 1 ×');
  await openFiltersIfCollapsed(page);
  await page.getByLabel('Make').fill(make);
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.locator('.vehicle-sticker')).toHaveCount(6);
  const lastCard = page.locator('.vehicle-sticker').last();
  const purchaseButton = lastCard.getByRole('button', { name: 'Purchase' });
  await purchaseButton.evaluate((button) => button.scrollIntoView({ block: 'end' }));
  const cardIsCovered = await lastCard.evaluate((card) => {
    const toast = document.querySelector('.status-message')!;
    const cardBounds = card.getBoundingClientRect();
    const toastBounds = toast.getBoundingClientRect();
    return (
      cardBounds.left < toastBounds.right &&
      cardBounds.right > toastBounds.left &&
      cardBounds.top < toastBounds.bottom &&
      cardBounds.bottom > toastBounds.top
    );
  });
  expect(cardIsCovered).toBe(false);
  await purchaseButton.click();
});

test('the last stock row action stays reachable while a toast is shown', async ({
  page,
  admin,
  vehicles,
}) => {
  const make = `ZZZ UIFIX ${randomUUID()}`;
  for (let index = 0; index < 6; index += 1) {
    await vehicles.create({ make, model: `UIFIX-${String(index).padStart(2, '0')}`, quantity: 3 });
  }
  await openAuthenticated(page, admin);
  await page
    .locator('.vehicle-sticker')
    .filter({ hasText: make })
    .first()
    .getByRole('button', { name: 'Purchase' })
    .click();
  await expect(page.getByRole('status')).toContainText('Purchased 1 ×');

  await page.getByRole('button', { name: 'Manage stock' }).click();
  const lastRow = page
    .getByRole('row')
    .filter({ hasText: make })
    .filter({ has: page.getByRole('button', { name: 'Restock' }) })
    .last();
  const restockButton = lastRow.getByRole('button', { name: 'Restock' });
  await restockButton.evaluate((button) => button.scrollIntoView({ block: 'end' }));
  const actionIsCovered = await restockButton.evaluate((button) => {
    const toast = document.querySelector('.status-message')!;
    const bounds = button.getBoundingClientRect();
    const toastBounds = toast.getBoundingClientRect();
    return (
      bounds.left < toastBounds.right &&
      bounds.right > toastBounds.left &&
      bounds.top < toastBounds.bottom &&
      bounds.bottom > toastBounds.top
    );
  });
  expect(actionIsCovered).toBe(false);
  await restockButton.click();
  await expect(page.getByRole('dialog')).toBeVisible();
});
