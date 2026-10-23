# HANDOVER

## Recap
- Phase 0 (planning) complete: `PRD.md` reviewed and rewritten, `AGENTS.md` merged with the
  doctrine, repository initialised (private).
- No application code yet. Next: Phase 1 (scaffold) per `PRD.md` section 2.

## Decisions
- Stack and all implementation decisions: `PRD.md` section 1 (UUID ids, `numeric(12,2)` price,
  atomic conditional purchase update, JWT ~1h in localStorage, admin seeded from env).
- Databases: Docker `postgres:16` locally and in CI; Supabase for preview and production.
- Commits: RED/GREEN split, `Co-authored-by` trailer per contributing model, never session URLs.
- Assessment PDF, `deleted/`, `_experiments/`, and `.env*` are git-ignored.
- Delegation (see the lead's HERDR playbook): codex luna / muse implement; reviews go to any of
  codex (review mode), opencode DeepSeek, kilo Agnes after every slice; reviews are cheap, use
  them freely. Lanes never commit; the lead commits RED after confirming failure, then GREEN.
  Parallel lanes use git worktrees under `../wt/` and a separate database each.

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
- Read `AGENTS.md`, then this file, then the relevant `PRD.md` phase before starting work.
- Append to `CHANGELOG.md` after each architectural, feature, or fix change.
- Update this file at the end of every session and phase.

## Mistakes to Avoid
- zsh does not word-split an unquoted `$VAR`; write CLI flags inline, never in a variable.
- Global skill installs: run `npx skills add … -g` from outside the project directory.
- Never use absolute paths or the user's name in repository files.
