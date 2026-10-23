# CHANGELOG

2026-10-24 02:20 | Planning baseline: PRD rewritten, AGENTS doctrine merged, handover and ignore rules added | PRD.md, AGENTS.md, HANDOVER.md, PROMPTS.md, .gitignore
2026-10-24 03:05 | P1 foundation: tooling, Docker PostgreSQL, health route, error envelope, migration runner, CI | package.json, src/server/, db/migrate.ts, tests/, .github/workflows/ci.yml, vercel.json
2026-10-24 03:40 | Supabase deployment wiring: verified TLS via bundled root CA, pooler URL format, RLS rule for migrations | vercel.json, db/certs/, .env.example, PRD.md, HANDOVER.md
