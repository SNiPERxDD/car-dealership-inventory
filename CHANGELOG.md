# CHANGELOG

2026-10-24 02:20 | Planning baseline: PRD rewritten, AGENTS doctrine merged, handover and ignore rules added | PRD.md, AGENTS.md, HANDOVER.md, PROMPTS.md, .gitignore
2026-10-24 02:40 | P1 foundation: tooling, Docker PostgreSQL, health route, error envelope, migration runner, CI | package.json, src/server/, db/migrate.ts, tests/, .github/workflows/ci.yml, vercel.json
2026-10-24 02:49 | Supabase deployment wiring: verified TLS via bundled root CA, pooler URL format, RLS rule for migrations | vercel.json, db/certs/, .env.example, PRD.md, HANDOVER.md
2026-10-24 03:12 | P1 closed: function pinned to bom1, production smoke verified, JWT secrets provisioned on Vercel | vercel.json, HANDOVER.md
2026-10-24 03:24 | P2 auth: users migration, register/login, HS256 middleware, admin seed and configuration | db/migrations/, db/seed.ts, src/server/auth/, src/server/config.ts, src/server/app.ts, src/server/middleware/, api/index.ts, package.json, .env.example, vitest.config.ts, HANDOVER.md
2026-10-24 03:37 | Migration runner enables RLS on its bookkeeping table | db/migrate.ts, tests/db/migrate.test.ts
2026-10-24 03:48 | P3 vehicle inventory: RLS migration, CRUD/search API, repositories, schemas and demo seed | db/migrations/0002_create_vehicles.sql, src/server/vehicles/, src/server/app.ts, db/seed.ts, tests/, HANDOVER.md
2026-10-24 04:18 | P4 atomic purchase and admin restock endpoints with validation and conflict mapping | src/server/vehicles/vehicle-repository.ts, src/server/vehicles/vehicle-service.ts, src/server/vehicles/schemas.ts, src/server/vehicles/routes.ts, tests/api/vehicle-restock.test.ts, tests/support/vehicles.ts
2026-10-24 04:51 | P5 frontend: window-sticker inventory, auth, admin stock management, typed API client and component tests | src/web/, tests/web/App.test.tsx, vitest.config.ts, index.html, public/favicon.svg, package.json
2026-10-24 06:44 | P6 Playwright suite, stale request fix, preview and production verification, screenshots, and demo access docs | tests/e2e/, playwright.config.ts, src/web/hooks/useVehicles.ts, eslint.config.js, docs/screenshots/, README.md, docs/test-report.md, HANDOVER.md
2026-10-24 10:17 | UI fixes: load errors, price sliders, delete focus, mobile targets, and toast flow | src/web/, tests/web/App.test.tsx, tests/e2e/
2026-10-25 20:27 | Visual redesign: brand system, photographic sign-in, body-type sticker art with sold stamp, admin stock ledger, stock cards below 1024 px, scroll reset between screens | src/web/, index.html, public/favicon.svg
2026-10-25 21:05 | Prevented stock lost updates, normalized body-parser errors, rejected NUL input, and clarified Node/browser setup | src/server/, src/web/components/VehicleFormDialog.tsx, src/web/hooks/useVehicles.ts, src/web/screens/Admin.tsx, tests/, package.json, package-lock.json, README.md, HANDOVER.md
2026-10-25 21:15 | Fixed redesign review: table semantics, purchase labels and locking, auth contrast, and filtered inventory state | src/web/, tests/web/App.test.tsx, tests/e2e/inventory.spec.ts, tests/e2e/failures.spec.ts
