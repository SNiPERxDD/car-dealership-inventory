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

Controlled verification described in PRD section 10 is pending the owner's approval.
