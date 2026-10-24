# Test report

Date: 2026-10-24
Commit: 38d740a

## Vitest

Command: `npm test`

- Test files: 13 passed.
- Tests: 148 passed.

## Playwright

- Local CI mirror: 62 passed across `chromium-desktop` and `webkit-mobile`.
- Protected Vercel preview with Supabase preview database: 60 passed, 2 skipped. The expired-token case requires the deployment's JWT secret, which is not available to the runner by design.

## GitHub Actions

Latest run on `main`: CI run 40045278009.

- `verify`: passed.
- `e2e`: passed.

## Production

Controlled verification completed on 2026-10-24 against [the production deployment](https://car-dealership-inventory-phi.vercel.app), deployed from commit 514587b.

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
