# AGENTS.md

> Read this file end-to-end before every task. It is the doctrine for this repository and
> outranks personal habit. The rules on secrets, paths, commits, `CHANGELOG.md`, and
> `HANDOVER.md` are not optional.

## 1. Source of Truth
- The Incubyte V2 assessment brief defines scope; `PRD.md` defines the plan and its decisions.
- Implement every specified endpoint and frontend requirement, including the smallest fixes.
- Scope discipline: implement exactly what is requested and follow its downstream consequences.
  If a change breaks dependent modules, fix them. Do not invent unrequested features.
- Read `HANDOVER.md` first for current state, decisions, and mistakes to avoid.

## 2. Mindset
- Quality over speed. Reason before acting: will this create technical debt or harm
  maintainability? No "spray and pray" coding.
- Think minimum viable (ponytail): build only what is asked, delete before adding, no
  unrequested abstractions or boilerplate. YAGNI, then stdlib, then native, then one line.
- Respond tersely (caveman): no filler, full technical accuracy.
- Act autonomously for local, reversible changes. Ask before destructive, hard-to-reverse,
  shared-system, or externally visible actions (pushes, deploys, repo settings, production data).
- Never make silent fallbacks or assumptions that cost money, consume quotas, or weaken
  security. If a required resource is unavailable, stop and ask before swapping it.

## 3. Stack
- React + TypeScript + Vite + Tailwind
- Express + TypeScript
- PostgreSQL (Docker locally and in CI, Supabase for preview/production)
- Vercel deployment
- Vitest, Supertest, Playwright

## 4. Development and TDD
- Work in feature-sized increments.
- Write behavioral tests first. Run them and confirm a meaningful RED, then GREEN.
- Commit RED and GREEN separately: `test: … (red)`, `feat: … (green)`, `refactor: …`.
- Refactor when warranted; never fabricate refactor commits.
- Follow SOLID pragmatically: route → service → repository, no speculative abstractions.
  S: routes own HTTP, services own business rules, repositories own SQL. O/L: extend by adding
  modules, not by inheritance. I: small contracts around real dependencies. D: inject the pool,
  repositories and configuration (e.g. `createApp({ pool, jwtSecret })`).
- Briefs for delegated work must cite the requirement source (assessment brief line, `PRD.md`
  section), state the exact contract (routes, statuses, error codes, schema), name the layer
  each piece belongs to under the SOLID split above, and require tests against the public
  contract only (HTTP, exported middleware, database). Steer a lane mid-task when it drifts.

## 5. Code Standards
- Production-grade, following project conventions and current best practices; verify online
  when unsure. No deprecated methods or packages.
- TypeScript strict mode; ESLint and Prettier clean.
- Names are specific and searchable (`VehicleInventoryRepository`, not `VIR`). No
  abbreviations unless universal.
- Handle edge cases and errors gracefully. No hardcoded paths or environment values.
- Avoid unnecessary computation or memory use; do not regress performance.
- Group related files; keep the structure in `PRD.md` section 4.
- Comments are neutral and documentation-grade, no emojis. Every non-trivial function and
  class gets a TSDoc block. Single-line comments only for brief clarifications.

## 6. Correctness and Security
- Validate inputs at API boundaries with Zod.
- Enforce permissions on the server, never only in the UI.
- Use parameterized SQL and database constraints.
- Inventory changes are single conditional SQL updates, never read-modify-write.
- Test failure paths and concurrency.
- Never expose secrets or credentials in client code, commits, or logs. Do not read secret values.
- Never run destructive tests against production data.

## 7. Modification Strategy
- Understand the code before modifying it. Make surgical edits; do not overhaul working code.
- Prefer the smallest delta from the known-good base.
- For high-risk or architectural changes, prototype in `_experiments/`, prove it with a smoke
  test, then replace the original.
- Root-cause failures from the full error output. If a fix does not hold, stop and re-evaluate.
- If the `codegraph` MCP tool is available, use it to navigate instead of re-reading files.

## 8. Verification
- Execute code to verify correctness; never claim tests passed unless they ran.
- Run affected tests after each change. Before completing a phase, run the full suite,
  typecheck, lint, and build.
- Read complete error output, not only the last line.
- Verify UI changes in real browsers and deployed behavior, including failure scenarios.
- Zero regression: existing functionality must keep working.

## 9. Commits and Publishing
- Every AI-assisted commit ends with two blank lines and a co-author trailer for each model
  that contributed, e.g. `Co-authored-by: Claude Opus 5.5 <noreply@anthropic.com>`.
  This trailer is an assessment requirement and is allowed in this repository.
- Never include session URLs, the user's name, absolute paths, or account/machine
  identifiers in commits, code, docs, logs, or notifications. Use relative paths.
- Push after every major chunk (a green slice, a phase, a doc baseline) once its checks pass.
  Standing approval for this repository; procedure in `HANDOVER.md`.

## 10. Documentation
- `HANDOVER.md`: concise ledger of current state, decisions, next steps, and mistakes to
  avoid. Update it at the end of every work session and phase.
- `CHANGELOG.md`: one concise line per architectural, feature, or bug-fix change, appended
  after the change is complete: `YYYY-MM-DD HH:MM | description | files`. Merge related
  entries; skip trivial changes.
- Update existing docs instead of creating new ones. No trivial documentation files.
- Keep docs truthful, neutral, and professional. No internal chatter or progress talk.

## 11. Repository and Submission
- Preserve raw AI logs/links in root `PROMPTS.md` (redact only paths, emails, session URLs,
  secrets).
- Maintain README setup instructions and the "My AI Usage" section.
- Include screenshots and an executed test report.
- Do not copy implementations from other repositories.

## 12. File Management
- Never permanently delete source files or documents: `mv <target> deleted/`.
  Caches, build output, and temporary folders may be deleted.
- Do not touch `deleted/` without explicit instructions. It is git-ignored.
- Do not reapply changes the user has discarded.

## 13. Avoid
- Mandatory agent orchestration or approval ceremonies.
- Fake TDD history or superficial tests.
- Overengineering, duplication, and unused abstractions.
- Speculative features.

## 14. Completion
- All brief requirements implemented and verified.
- Tests and CI pass.
- No unresolved critical defects.
- Deployment and submission evidence are inspectable.
