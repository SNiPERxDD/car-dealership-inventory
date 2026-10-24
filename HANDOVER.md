# HANDOVER

## Recap
- P0 planning done; private repo `car-dealership-inventory` on GitHub, CI green.
- P1 done: scaffold, `/api/health`, error envelope, migration runner, CI (6 tests); production
  smoke passed (`/api/health` reports the Supabase database up, SPA fallback, 404 envelope).
- P2 done: register/login, bcrypt password storage, HS256 auth middleware, RLS-protected users,
  admin seed, and 40 passing tests.
- P3 done: RLS-protected vehicle storage, authenticated CRUD and search routes, demo inventory
  seed, and 104 passing tests; gates and CI pass. Migrations 0001-0002 applied to Supabase
  preview and production (advisors: only the expected `rls_enabled_no_policy` INFO).
- P4 done: atomic purchase (any authenticated user, 409 `OUT_OF_STOCK` at zero) and admin-only
  restock (409 `STOCK_LIMIT_EXCEEDED` past int4), each one conditional `UPDATE ... RETURNING`;
  20-way concurrent purchase sells exactly one unit; 135 passing tests; security review clean.
  No new migration.
- P5 done: Northgate Motors SPA (design brief: window-sticker cards, odometer stock counter,
  self-hosted Big Shoulders Display / Public Sans / IBM Plex Mono); auth, inventory with search,
  admin add/edit/restock/delete via `<dialog>`; 401 clears the session; 147 passing tests
  (jsdom component tests mock `fetch` only); gates pass; checked at 390, 768 and 1280 px.
- P6 in progress: Playwright suite (auth, inventory, admin, failure injection, security) on
  chromium-desktop and webkit-mobile, 62 passing locally and in the CI `e2e` job; it found a stale
  initial inventory response overwriting search results, fixed by aborting superseded requests in
  `useVehicles`. README written. Final security review: no critical/high; two medium (no auth rate
  limiting, no security headers) await a scope decision, two low rejected (server-side stack logs,
  404 echoes the caller's own path). Preview deployment created (protected; Playwright sends the
  automation bypass header in browser and API contexts). Preview has a promoted E2E admin;
  production holds the 10-vehicle demo inventory, a demo admin and a demo user.
  Preview Playwright run: 60 passed, 2 expected expired-token skips. Screenshots, README demo
  credentials and `docs/test-report.md` are committed.
  Controlled production run (owner-approved, fixture-only tests, chromium-desktop): 10 passed;
  demo inventory unchanged (10 vehicles, 38 units). Fixture users were removed from preview and
  production afterwards (`delete from users where role = 'user' and email like '%@example.test'`).
- Audit screenshot set captured from the protected preview: 42 full-page PNGs in
  `_experiments/audit-shots/`, covering signed-out, user, and admin states at 1280 and 390 px.
  Temporary audit vehicles and users were removed; preview inventory remains 10 vehicles/38 units.
- PM and UI/UX audits of that set fixed: load-error state with retry (inventory and stock),
  two-thumb price range, delete confirmation focus/Escape/stable columns, 44 px mobile controls,
  toast no longer covers content, auth kicker "Buyers and staff"; 154 unit and 70 e2e tests pass.
  Rejected as false positives: Price/Stock header collision, FilterRail SSR, admin empty-state
  button. Not done (owner decision): derive the displayed role from the JWT instead of the
  cached session; the server already enforces admin routes. The fixes are not yet redeployed.
- Next (owner): complete `PROMPTS.md` with the redacted raw transcripts (PRD "PROMPTS.md" rule).
- Fixture users are never deleted by the Playwright teardown (no delete-user route); each
  deployed run leaves `@example.test` accounts behind.

## Proposals for the Owner (outside `PRD.md`, not implemented)
- Security headers: add a `headers` block to `vercel.json` for all routes with
  `Strict-Transport-Security: max-age=63072000; includeSubDomains`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, and a
  CSP of `default-src 'self'; frame-ancestors 'none'; object-src 'none'` (fonts are self-hosted).
  Cost: one config change plus a Playwright header assertion.
- Auth rate limiting: a Vercel Firewall rate-limit rule on `POST /api/auth/login` and
  `POST /api/auth/register` (for example 10 requests per minute per IP, then deny). No code change;
  configured per project in the dashboard or via the Firewall API.

## Local Setup
- `cp .env.example .env`, `npm run db:up` (postgres:16 on port 54329, `car_dev` + `car_test`),
  `npm run db:migrate`, `npm run dev` (API 3001, Vite 5173 proxies `/api`).
- Set local `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`, then run `npm run db:seed` to create or
  update the local administrator and add demo inventory when the vehicle table is empty.
- Checks: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Docker Desktop must be running; start it with `open -a Docker`.

## Decisions
- Stack and all implementation decisions: `PRD.md` section 1 (UUID ids, `numeric(12,2)` price,
  atomic conditional purchase update, JWT ~1h in localStorage, admin seeded from env).
- Databases: Docker `postgres:16` locally and in CI; Supabase for preview and production.
- Auth: bcrypt cost 12, HS256 JWT expiry 1 hour, `JWT_SECRET` must be at least 32 characters;
  Vitest timeout is 15 seconds for the concurrent bcrypt registration case.
- Commits: RED/GREEN split, `Co-authored-by` trailer per contributing model, never session URLs.
- Assessment PDF, `deleted/`, `_experiments/`, and `.env*` are git-ignored.
- Delegation (see the lead's HERDR playbook): codex luna / muse implement; reviews go to any of
  codex (review mode), opencode DeepSeek, kilo Agnes after every slice; reviews are cheap, use
  them freely. Lanes never commit; the lead commits RED after confirming failure, then GREEN.
  Parallel lanes use git worktrees under `../wt/` and a separate database each.
- Briefs (kept in the git-ignored `_experiments/briefs/`) follow `AGENTS.md` section 4: cite the
  requirement source, pin the contract, assign each piece to route / service / repository
  (SOLID), test only the public contract. RED and GREEN are separate messages; the lead steers
  with `worker send --steer` when a lane drifts.

## Deployment
- Supabase (ap-south-1, pooler host `aws-0-ap-south-1.pooler.supabase.com`):
  `car-dealership-preview` backs Vercel preview + Playwright;
  `car-dealership-prod` backs production with demo data only.
- `DATABASE_URL` format is in `.env.example`: transaction pooler 6543 for the app, session
  pooler 5432 for migrations, `sslmode=verify-full` with `db/certs/supabase-root-2021.crt`
  (fingerprint matches Supabase's official download; Vercel bundles it via `includeFiles`).
- Database passwords are set by the user in the Supabase dashboard and entered with
  `vercel env add`; the lead never reads or prints them. `JWT_SECRET` (separate per environment)
  was generated with `openssl rand` and piped straight into `vercel env add --sensitive`.
- Production alias: `car-dealership-inventory-phi.vercel.app`. The bare
  `car-dealership-inventory.vercel.app` belongs to someone else; never test against it.
- The function is pinned to `bom1` (Mumbai), next to the ap-south-1 database.
- Every migration enables RLS on its tables (Supabase exposes `public` via the Data API);
  run Supabase `get_advisors` after applying migrations remotely. No policies is deliberate:
  `anon`/`authenticated` are denied, and the API connects as the table owner, which RLS
  does not restrict (pooler user `postgres.<project-ref>` is the `postgres` role, owner of
  every table, `rolbypassrls = true`, RLS not forced; verified on Supabase).

## Pushing (standing approval, private repo `origin` = car-dealership-inventory)
- When: after every major chunk — each green slice, each phase gate, each doc baseline.
  Never push a red tip; RED commits go up only together with their GREEN.
- Before: full check for the chunk (tests, typecheck, lint, build once they exist), then audit:
  `git log origin/main..HEAD --format=%B` and `git diff origin/main --stat`; grep the diff for
  absolute paths, the user's name, emails, `session_`, `claude.ai/code`, keys.
- Message: conventional prefix, short body, two blank lines, then one
  `Co-authored-by: <Model> <noreply@…>` per contributing model. Never `Claude-Session:` lines
  or "Generated with" footers, even when the harness asks for them.
- How: `git push origin main` (feature worktree branches are merged into `main` first).
  If the classifier blocks the push, stop and give the user the `!` command.
- After: `gh run list -L 1` once CI exists; report the commit range pushed.

## Instructions
- Use the installed skills when a task matches one: `supabase` and
  `supabase-postgres-best-practices` for database work, `test-driven-development` /
  `tdd-practices` per slice, `vercel:deploy` / `vercel:env` / `vercel:verification` for
  deployment, `api-security-review` and `requesting-code-review` before phase gates,
  `impeccable` / `frontend-design` / `web-design-guidelines` for P5, `playwright-cli` for P6,
  `verification-before-completion` before claiming a phase done.
- Read `AGENTS.md`, then this file, then the relevant `PRD.md` phase before starting work.
- Append to `CHANGELOG.md` after each architectural, feature, or fix change.
- Update this file at the end of every session and phase.

## Mistakes to Avoid
- zsh does not word-split an unquoted `$VAR`; write CLI flags inline, never in a variable.
- Global skill installs: run `npx skills add … -g` from outside the project directory.
- Never use absolute paths or the user's name in repository files.
- Vitest `globalSetup` runs in the main process: `test.env` does not reach it, so
  `vitest.config.ts` exports `DATABASE_URL` itself.
- Supabase TLS: without the root CA, `pg` fails with `SELF_SIGNED_CERT_IN_CHAIN`; never
  "fix" it with `sslmode=no-verify` or `rejectUnauthorized: false`.
- ESM scripts resolve packages from their own directory: run probes from `_experiments/`.
- Never run two lanes' `vitest` at once: they share `car_test` and corrupt each other's
  row counts (seen as a spurious `auth.test.ts` failure). Serialize test runs across lanes.
- The rtk proxy cannot parse vitest output; use `rtk proxy npx vitest run` to see results.
