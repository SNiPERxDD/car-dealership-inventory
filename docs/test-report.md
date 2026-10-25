# Test report

Date: 2026-10-25
Commit: 4e288dc

## Screenshots

- Authentication and administration: 1280 × 900; inventory: 1280 px wide, full page; mobile inventory: 390 × 844 CSS px, full page.
- All four images were opened and checked. Inventory shows 10 demo vehicles; the administration dialog is fully visible.

## Local checks

- Vitest: 14 files, 165 tests, 0 failures, 0 errors, 0 skipped.
- Typecheck: passed.
- Lint: passed.
- Build: passed.
- Prettier: passed.
- Playwright: 70 passed, 0 failed, 0 skipped across `chromium-desktop` and `webkit-mobile`.

## GitHub Actions

Latest run on `main`: CI run 40209842459, success.

## Earlier deployed verification (2026-10-24, before the redesign)

- Protected Vercel preview with Supabase preview database: 60 passed, 2 skipped. The expired-token case requires the deployment's JWT secret, which is not available to the runner by design.

### Production

Controlled verification completed on 2026-10-24 against [the production deployment](https://car-dealership-inventory-phi.vercel.app), deployed from commit eca61dd.

- Result: 10 passed, 0 failed, 0 skipped; chromium-desktop.
- Fixture vehicles: all removed successfully by teardown.
- Tests run:
  - logs in through the form and logout clears both stored session values
  - lists the isolated fixture vehicle
  - searches by make, model, and category
  - user tokens cannot create, update, delete, or restock vehicles
  - unexpected id and purchase quantity fields are rejected without changing inventory
  - blocks invalid price and quantity in the client and shows server validation errors
  - zero-stock stickers disable purchase and say out of stock
  - maps an out-of-stock conflict to clear purchase copy
  - purchase decrements the stock odometer and shows a success message
  - restocks a vehicle and verifies the new quantity through the API
