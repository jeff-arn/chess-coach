# chess-coach — Design Spec

**Date:** 2026-06-19
**Status:** Approved design, pre-implementation
**Author:** jeffa (with Claude)

## 1. Summary

`chess-coach` is a personal, locally-run AI chess coach for a complete beginner. It
connects to a chess.com account, objectively analyzes the user's games with the
Stockfish engine, distills the results into a **weakness profile**, and uses a
pluggable **Coach** (Claude by default) to sequence a curated beginner curriculum
and set concrete chess.com rating milestones. Progress is measured against real
rating movement and reduced mistake rates over time.

Single user. No accounts. All data stays on the user's machine.

## 2. Goals & non-goals

### Goals (v1)

A complete end-to-end loop, thin but working:

1. Connect a chess.com account by username and fetch recent games.
2. Analyze each game move-by-move with Stockfish.
3. Aggregate analysis into a weakness profile.
4. Have the coach produce a personalized lesson plan from a **small starter
   curriculum (~8–12 beginner modules)** and define a rating milestone.
5. Let the user work through modules (lesson + interactive board + practice).
6. Track progress toward the milestone by re-syncing games and re-computing the
   profile.

### Non-goals (v1)

- Multi-user / accounts / auth.
- Cloud hosting (runs locally only).
- A large/comprehensive curriculum (starter set only).
- Authoring lesson content with the LLM (curriculum is pre-authored; the LLM
  sequences and explains).
- Playing against an engine / live in-game coaching.
- Lichess or other platform integrations.

## 3. Users & assumptions

- One user (the developer), a near-complete beginner at chess.
- The user has a chess.com account with public game archives.
- The user can supply a Claude API key for the default coach.
- The machine can run Stockfish WASM in a browser (modern browser, reasonable CPU).

## 4. Architecture

A single **Next.js (TypeScript)** application run locally. The browser handles UI
and engine analysis; thin Next.js API routes handle the concerns that cannot or
should not run client-side; a local SQLite file holds all state.

### Tiers

**Browser (React UI + Web Worker)**
- UI screens: Onboarding, Dashboard, Lesson Plan, Module viewer, Game Review,
  Progress, Settings.
- Chessboard rendering and rules via a board component + `chess.js` (replay,
  stepping, practice positions).
- **Stockfish (WASM)** in a Web Worker: evaluates every move of every game. Free,
  offline, no API limits.

**Next.js API routes (server, local machine)**
- `/api/chess-com` — fetches the user's public game archives (PGN) and current
  rating by username. Server-side to avoid CORS and to attach a proper User-Agent.
- `/api/coach` — proxies the Coach (Claude by default). Sends the weakness profile
  + curriculum catalog, returns a structured plan and explanations. Keeps the API
  key server-side.
- `/api/db` — reads/writes SQLite (games, analyses, profiles, plans, progress,
  milestones, settings).

**Local storage & external services**
- **SQLite file** (`chess-coach.db`) on disk — durable, inspectable, easy to back up.
- **Curriculum content** — pre-authored modules bundled in the repo.
- **chess.com API** (external) — public, read-only: games + rating by username.
- **Claude API** (external) — the default coach brain.

### Core loop

```
enter username
  → fetch recent games (chess.com)
  → Stockfish annotates each move (browser worker)
  → aggregate into a weakness profile
  → Coach maps weaknesses → curriculum modules + sets a rating milestone
  → user works through modules
  → re-sync games → recompute profile → measure progress
```

## 5. Analysis pipeline (deterministic)

1. Fetch recent rated games from chess.com (default: last ~20, configurable).
2. Parse each PGN with `chess.js`; replay move-by-move; Stockfish evaluates each
   position at a **fixed depth** (for reproducible evaluations).
3. Classify each of the user's moves by centipawn loss → `best / good /
   inaccuracy / mistake / blunder` (thresholds defined canonically in
   `chess-domain.md`).
4. Tag concrete patterns per move: hung pieces, missed tactics (fork/pin/skewer),
   missed mates, opening-principle violations (no development, early queen),
   weak endgame technique.
5. Aggregate across games into a **weakness profile**: a structured object of
   weakness-tag → frequency/severity, with example positions (FEN + game ref)
   attached.

The weakness profile is the contract between the analysis pipeline and the coach.
Its taxonomy lives in `chess-domain.md`.

## 6. Coaching (pluggable `Coach` interface)

The coaching "brain" sits behind a single `Coach` interface so it is swappable and
testable. v1 ships **Claude (latest model) as the default**, with a deterministic
rules-based fallback.

**Input to the coach:** weakness profile + current/target rating + curriculum
catalog (module metadata and the weakness-tags each module addresses) + the user's
progress so far.

**Output (structured JSON via tool-calling, schema-validated):**
- An ordered lesson plan: which modules, in what order, and *why*.
- A short per-game feedback note.
- A milestone definition (start rating, target rating).

**Guardrails (see `llm-coach.md`):**
- The coach **selects from the fixed curriculum** and is **grounded in Stockfish
  facts** — it never invents chess evaluations or moves.
- Tool-calling + schema validation with one retry; on repeated failure, fall back
  to the rules-based coach.
- Fetched game data is treated as untrusted input to the prompt.

**Fallback (rules-based):** deterministic mapping of weakness-tags → modules by
threshold/priority. Used when Claude is unreachable or returns invalid output;
surfaces a "fallback mode" banner in the UI.

## 7. Curriculum

A curated, pre-authored library of ~8–12 beginner modules bundled in the repo as
structured data. The coach picks order/pacing; it does not author content.

Each module:

```
id, title, order_hint, difficulty,
weakness_tags: ["hangsPieces", "missesForks", ...]   // coach matches to profile
content: markdown,                                    // the lesson text
example_positions: [{ fen, caption, moves }],         // step-through on the board
practice: [{ fen, solution, hint }],                  // a few puzzles
completion_criteria                                   // e.g. solve N/M practice
```

Starter set covers the true-beginner path: board awareness / don't hang pieces,
basic tactics (fork, pin, skewer), opening principles, basic checkmates (K+Q,
K+R), basic king-and-pawn endgames, spotting opponent threats, simple tactical
patterns.

## 8. Milestones & progress

- The user sets a target rating (e.g., current 400 → 600).
- The app periodically re-syncs the chess.com rating and re-computes the weakness
  profile.
- Progress is measured against **real rating movement** and **reduced mistake
  rates**, not merely modules completed.
- Dated weakness-profile snapshots + milestone rating-sync history power the
  progress charts and let the coach reference concrete improvement ("blunder rate
  dropped from 0.45 to 0.20").

## 9. Data model (SQLite)

- `settings` — chess.com username, target rating, coach config (which brain), API
  key location.
- `games` — fetched games (PGN, result, date, time control, user's color).
- `analyses` — per-game Stockfish output: per-move classification + tagged patterns.
- `weakness_profiles` — dated snapshots of the aggregated profile (for charting).
- `plans` — the current lesson plan (ordered module refs + coach rationale).
- `module_progress` — per-module status (not-started / in-progress / completed) +
  practice scores.
- `milestones` — target rating, start rating, status, and a history of rating syncs.

## 10. UI / screens

Hub-and-spoke layout with a persistent left nav.

- **Onboarding** — enter chess.com username + pick a target rating.
- **Dashboard** (hub) — milestone progress, top weaknesses this week, the coach's
  next steps, latest game at a glance.
- **Lesson Plan** — ordered list of modules with the coach's rationale for each.
- **Module viewer** — lesson text + interactive board + practice puzzles.
- **Game Review** — replay a game on the board with per-move Stockfish/coach
  annotations.
- **Progress** — charts of rating and mistake-rates over time.
- **Settings** — username, target, coach configuration.

## 11. Error handling & edge cases

- **chess.com unavailable / unknown username** → clear onboarding error; on a
  failed sync, keep showing the last cached games/profile rather than blanking out.
- **Claude unreachable / errors** → fall back to the rules-based coach; show a
  fallback-mode banner.
- **Stockfish worker failure for one game** → skip that game, log it, continue the
  batch; analysis runs incrementally with a progress indicator.
- **Malformed PGN / unusual variants** → skip and report which games could not be
  analyzed.
- **Coach returns malformed JSON** → schema validation + one retry, then
  rules-based fallback.
- **New account with very few games** → start from the default beginner sequence
  instead of a profile.
- **Long games / heavy analysis** → cap engine depth and games-per-sync (both
  configurable).

## 12. Testing strategy

A three-layer pyramid; each behavior owned by exactly one layer.

- **Unit (Vitest):** pure functions — move classification (centipawn loss →
  category), pattern taggers (hung piece, fork detection), weakness aggregation —
  tested against known PGNs with expected outputs. Happy + negative + variant
  coverage.
- **Component (Vitest + React Testing Library):** user-visible component behavior;
  query by role/accessible name; `userEvent` for interactions.
- **Integration:** the full analysis→plan loop on a fixed PGN set → deterministic
  weakness profile → plan generation via the rules-based coach (deterministic in CI).
- **E2E (Playwright):** real-browser journeys with external services mocked
  (network interception serving fixture PGNs and canned coach JSON; seeded SQLite
  fixtures). Stockfish output is stubbed for determinism, with one optional "smoke"
  test running the real engine on a single short game to prove the worker wires up.

**Critical E2E journeys:**
1. Onboarding → first sync (games fetch, dashboard populates with profile + plan).
2. Game Review (open a game, step the board, see per-move annotations).
3. Module flow (open module, read lesson, solve a practice puzzle, mark complete →
   plan/progress update).
4. Re-sync → milestone (new fixture games update milestone/progress numbers).
5. Coach fallback (Claude mocked to fail → rules-based plan still generates, banner
   shows).

External services (chess.com, Claude) are wrapped in clients that are mocked in
tests via a single seam.

## 13. Repo conventions & guardrails

Mirrors the structure and tone of the `chainsmith-web` project: a root `CLAUDE.md`
plus a `.claude/rules/` directory of opinionated rule files, each ending with a
"when to break a rule" clause.

### `CLAUDE.md` (root)

Project overview; the full stack (Next.js, React, TypeScript `strict`, Stockfish
WASM, SQLite, `chess.js`, Playwright, Vitest); a project-phase marker; hard
requirements; an index of the rules files; common commands; and a "definition of
done."

### `.claude/rules/`

| File | Covers |
|------|--------|
| `clean-code.md` | TypeScript/clean-code: one-job functions, intent-revealing names, no `any`/non-null assertions, discriminated unions, comments explain *why*, YAGNI / anti-over-engineering, lint-suppression discipline. |
| `nextjs-react.md` | Next.js + React patterns: server vs client component boundary, where API routes live, data fetching, hooks discipline, state ownership, file layout. |
| `web-ui.md` | Web UI: semantic HTML, WCAG accessibility (keyboard, focus, contrast), responsive layout, chessboard/board-interaction patterns, design tokens, no inline styles. |
| `testing.md` | The test pyramid above; what "tested" means (happy + negative + variants); how to treat a failing test; the single mock seam. |
| `security.md` | Claude API key server-side only / never in the client bundle; `.env` gitignored + `.env.example`; parameterized SQL; input validation on chess.com username; external + LLM data treated as untrusted; CSP; dependency hygiene (committed lockfile, pinned versions). |
| `llm-coach.md` | Claude integration guardrails: structured/tool-call output + schema validation, grounding in Stockfish facts, never inventing chess evaluations, graceful fallback, fetched game data as untrusted prompt input. |
| `chess-domain.md` | Canonical chess vocabulary + the weakness-tag taxonomy + centipawn-loss classification thresholds. The cross-subsystem contract shared by analysis, curriculum tags, and the coach. |
| `engine-analysis.md` | Stockfish WASM worker discipline: worker lifecycle, fixed depth/time for reproducible evaluations, non-blocking UI, caching analysis to avoid re-analysis. |
| `external-apis.md` | chess.com + Claude client conventions: required User-Agent + rate-limit politeness for chess.com, timeouts, retry/backoff, response validation at the boundary, the single mock seam tests hook into. |
| `data-persistence.md` | SQLite layer: schema migrations, where queries live, parameterized queries always, fresh-object fixture factories. |
| `commits.md` | Conventional Commits message format. |

### Git hooks

- **`pre-commit`** — `gitleaks` secret scan, then typecheck, lint, and tests.
- **`commit-msg`** — validates the subject line against `commits.md` (Conventional
  Commits).

These files and hooks are created as part of the implementation plan.

## 14. Tech stack summary

- **Framework:** Next.js (TypeScript, `strict`).
- **UI:** React + a chessboard component; `chess.js` for rules.
- **Engine:** Stockfish WASM in a Web Worker.
- **Persistence:** local SQLite file.
- **Coach:** pluggable `Coach` interface; Claude (latest model) default +
  rules-based fallback.
- **External:** chess.com public API; Claude API.
- **Testing:** Vitest + React Testing Library + Playwright.
- **Tooling:** ESLint + Prettier; `gitleaks` + git hooks.

## 15. Open questions / future work

- Exact Stockfish depth and games-per-sync defaults (tune during implementation).
- Whether to expand the curriculum beyond the starter set (post-v1).
- Local-model (Ollama) coach implementation behind the `Coach` interface (post-v1).
- Cloud deployment / multi-device access (explicitly out of scope for v1).
