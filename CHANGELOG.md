# CHANGELOG

2026-10-24 02:20 | Planning baseline: PRD rewritten, AGENTS doctrine merged, handover and ignore rules added | PRD.md, AGENTS.md, HANDOVER.md, PROMPTS.md, .gitignore
2026-10-24 02:40 | P1 foundation: tooling, Docker PostgreSQL, health route, error envelope, migration runner, CI | package.json, src/server/, db/migrate.ts, tests/, .github/workflows/ci.yml, vercel.json
2026-10-24 02:49 | Supabase deployment wiring: verified TLS via bundled root CA, pooler URL format, RLS rule for migrations | vercel.json, db/certs/, .env.example, PRD.md, HANDOVER.md
2026-10-24 03:12 | P1 closed: function pinned to bom1, production smoke verified, JWT secrets provisioned on Vercel | vercel.json, HANDOVER.md
2026-10-24 03:24 | P2 auth: users migration, register/login, HS256 middleware, admin seed and configuration | db/migrations/, db/seed.ts, src/server/auth/, src/server/config.ts, src/server/app.ts, src/server/middleware/, api/index.ts, package.json, .env.example, vitest.config.ts, HANDOVER.md
2026-10-24 03:37 | Migration runner enables RLS on its bookkeeping table | db/migrate.ts, tests/db/migrate.test.ts
