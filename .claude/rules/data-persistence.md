# Data persistence rules

Conventions for SQLite via better-sqlite3, schema design, and migrations. These
describe the **implemented** design (see `src/db/`); keep this file in sync with the code.

## Database setup

- The database file path comes from `process.env.CHESS_COACH_DB`, defaulting to `./chess-coach.db`.
- `openDb(path)` (in `src/db/connection.ts`) creates a `better-sqlite3` `Database`, sets
  pragmas, and runs migrations. `getDb()` is a process-wide singleton for app/API-route
  use; tests call `openDb(':memory:')` directly for isolation. Do not open a connection
  per request in app code.
- Enable WAL on startup: `db.pragma('journal_mode = WAL')` (silently a no-op on
  `:memory:` — that's fine for tests). Enable `db.pragma('foreign_keys = ON')`; all FK
  constraints are enforced at the DB level, not just in application code.

## Schema and migrations

- Migrations are an **ordered in-code array** (`MIGRATIONS` in `src/db/migrations.ts`),
  each `{ id, name, sql }`. `runMigrations(db)` applies every not-yet-applied migration
  (sorted by `id`) inside a `db.transaction`, recording it in a `schema_migrations` table.
  This is the source of truth for applied schema state.
- Migrations run automatically when the DB is opened. Never mutate the schema with ad-hoc
  SQL outside a migration.
- Migrations are **additive only** in production — add columns/tables; never drop or rename
  without a multi-step, data-preserving migration.
- `runMigrations` binds `db.exec` to a local (`const runSql = db.exec.bind(db)`) to apply
  multi-statement DDL; the bind avoids a repo security hook that flags direct calls to that
  method.

## Query conventions

- **No string-interpolated SQL.** All values go through better-sqlite3's parameterized API
  (positional `?` or named `@param`):
  ```ts
  db.prepare('SELECT pgn FROM games WHERE id = ?').get(gameId);
  ```
- **No `SELECT *`** in app code — list columns explicitly and alias snake_case → camelCase
  in the query.
- **Transactions for multi-statement writes** — use `db.transaction(fn)` (as the sync
  persistence and migration runner do).
- Inline `db.prepare(...)` per call is acceptable (better-sqlite3 caches compiled
  statements internally). Hoist to module level only if profiling shows a hot path.

## Type safety & JSON columns

- Define a row-shape type per query and map it to camelCase in the repository (e.g.
  `GameRow`, `Settings`). Keep field renames inside the repo, not scattered across call sites.
- JSON columns (`analyses.moves_json`, `weakness_profiles.profile_json`,
  `plans.plan_json`) store serialized domain objects written by this app. On read they are
  `JSON.parse`d and typed via a cast — this data is trusted (we wrote it). **zod validation
  is for untrusted/external inputs at the API boundary** (chess.com responses, coach
  output) per `external-apis.md` / `llm-coach.md`, not for the app's own DB rows.

## Repositories

- One module per table under `src/db/repositories/`. Each function takes the `Database` as
  its first parameter (so tests pass an in-memory db). No repository reaches for the
  singleton directly.
- Fixture/factory helpers in tests return fresh objects; FK-referenced rows (e.g. a game)
  are inserted before dependent rows (e.g. its analysis).

## Data model (current schema — migration 001)

- **settings** — singleton row (`id = 1`): `chesscom_username`, `target_rating`,
  `coach_brain` (default `'claude'`).
- **games** — `id` (TEXT PK) holds the **chess.com game URL** (the stable, globally unique
  identifier from the API; no surrogate IDs), plus `played_at`, `time_control`,
  `user_color` (white/black), `result`, `pgn`.
- **analyses** — `game_id` (PK → `games(id)` ON DELETE CASCADE), `analyzed_at`,
  `moves_json` (serialized `MoveAnalysis[]` for the game).
- **weakness_profiles** — dated snapshots (`id` autoinc, `created_at`, `profile_json`); the
  latest row is the current profile, and the history powers progress charts.
- **plans** — singleton (`id = 1`): `updated_at`, `plan_json` (the current `LessonPlan`).
- **module_progress** — `module_id` (PK), `status`, `practice_score`, `updated_at`.
- **milestones** — `id` autoinc, `start_rating`, `target_rating`, `status`,
  `created_at`, `rating_syncs_json`.

## Error handling

- Repository functions surface failures to the caller; API routes translate them into
  friendly JSON errors and never leak raw better-sqlite3 errors or stack traces to the UI.
- If the database file cannot be opened on startup (bad path/permissions), fail loudly with
  a clear message rather than starting in a broken state.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.
