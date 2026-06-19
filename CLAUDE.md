# Project Instructions for AI Agents

This file provides instructions and context for AI coding agents working on this project.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->


---

# chess-coach

A personal, locally-run AI chess coach for a beginner. Connects to a chess.com
account, analyzes games with Stockfish, distills a weakness profile, and uses a
pluggable Coach (Claude by default) to sequence a curated beginner curriculum and
set rating milestones. Single user, no accounts, all data local.

- Design spec: `docs/superpowers/specs/2026-06-19-chess-coach-design.md`
- Implementation plans: `docs/superpowers/plans/` (Plan 1 = foundation & domain core)

> **Tracking:** This repo uses **beads** (see the integration block above) as the
> source of truth for tasks, status, and dependencies. The markdown plans are the
> detailed implementation reference (the code/tests for each task); each bead links
> back to its plan section. Use `bd ready` to find the next unblocked task.
>
> **Note on the Session Completion block above:** this project has no git remote
> yet, so the mandatory `git push` step is a no-op until a remote is added — commit
> locally instead.

## Stack

- Framework: Next.js 15 (App Router), TypeScript `strict` (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`), pnpm
- Chess rules / PGN: `chess.js`
- Engine: Stockfish WASM in a Web Worker (browser)
- Persistence: local SQLite via `better-sqlite3`
- Coach: pluggable `Coach` interface; Claude (latest model) default + rules-based fallback
- Validation: `zod`
- Testing: Vitest + React Testing Library (unit/component), Playwright (E2E)
- Lint/format: ESLint (`next/core-web-vitals`, `next/typescript`) + Prettier

## Project phase

**Current phase:** `pre-launch` <!-- single user; APIs and schema can break freely -->

## Hard requirements

- **Strict TypeScript.** No `any`, no non-null assertions outside generated code.
- **The Claude API key never reaches the client bundle.** It is read server-side in
  API routes only. See `.claude/rules/security.md`.
- **Stockfish facts ground the coach.** The LLM never invents evaluations or moves;
  it selects from the fixed curriculum. See `.claude/rules/llm-coach.md`.
- **Strict testing discipline.** Happy + negative + variant coverage. A failing test
  is investigated, not weakened. See `.claude/rules/testing.md`.
- **The weakness-tag taxonomy and centipawn thresholds are canonical** and live in
  `src/domain/` per `.claude/rules/chess-domain.md`. Do not redefine them elsewhere.

## Rules files

These are created in Plan 1 (Task 2). Read the relevant file for its domain:

- `.claude/rules/clean-code.md`: function design, naming, comments, anti-over-engineering, TS specifics
- `.claude/rules/nextjs-react.md`: server vs client components, API routes, hooks, state ownership, file layout
- `.claude/rules/web-ui.md`: semantic HTML, accessibility, responsive layout, chessboard patterns, design tokens
- `.claude/rules/testing.md`: Vitest, RTL, Playwright, the mock seam, what "tested" means
- `.claude/rules/security.md`: server-only secrets, parameterized SQL, untrusted input, CSP, deps
- `.claude/rules/llm-coach.md`: structured output, grounding, fallback, untrusted prompt input
- `.claude/rules/chess-domain.md`: chess vocabulary, weakness-tag taxonomy, classification thresholds
- `.claude/rules/engine-analysis.md`: Stockfish worker discipline, reproducible evals, caching
- `.claude/rules/external-apis.md`: chess.com + Claude client conventions, the mock seam
- `.claude/rules/data-persistence.md`: SQLite migrations, query layer, parameterized queries
- `.claude/rules/commits.md`: Conventional Commits

## Git hooks (code quality)

Distinct from beads' Claude session hooks. Wired via `git config core.hooksPath .githooks`:

- `pre-commit`: `gitleaks` secret scan, then `pnpm typecheck`, `pnpm lint`, `pnpm test:run`.
- `commit-msg`: validates the subject against Conventional Commits.

## Common commands

```bash
pnpm dev          # dev server
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest watch
pnpm test:run     # vitest single run (CI / pre-commit)
```

## Definition of done

- `pnpm typecheck` passes
- `pnpm lint` passes
- `pnpm test:run` passes, including negative and variant cases for changed code
- New behavior has tests at the correct layer (see `testing.md`)
- No secrets added to the client bundle or the repo
- The corresponding bead is updated/closed (`bd close <id>`)
