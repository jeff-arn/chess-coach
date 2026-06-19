# Data persistence rules

Conventions for SQLite via better-sqlite3, schema design, and migrations.

## Database setup

- The database file path comes from `process.env.CHESS_COACH_DB`, defaulting to `./chess-coach.db`. Validate the path at startup.
- Instantiate the `better-sqlite3` `Database` object once, in a module-level singleton (`src/db/client.ts` or similar). Do not open the database connection per request.
- Enable WAL mode on startup: `db.pragma('journal_mode = WAL')`. WAL allows concurrent reads during writes, which matters for game analysis running alongside UI queries.
- Enable foreign keys: `db.pragma('foreign_keys = ON')`. All foreign key constraints must be enforced at the database level, not only in application code.

## Schema and migrations

- Schema lives in versioned migration files (`src/db/migrations/`). Each migration is a numbered SQL file: `0001_initial.sql`, `0002_add_coach_cache.sql`, etc.
- Migrations run automatically on startup if the schema version is behind. Never mutate the schema in ad-hoc SQL outside a migration file.
- Migrations are **additive only** in production — add columns or tables; never drop or rename without a multi-step migration that preserves data.
- Store the current schema version in a `schema_version` table or via `PRAGMA user_version`.

## Query conventions

- **No string-interpolated SQL.** All values go through `better-sqlite3`'s parameterized API:
  ```ts
  const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
  const game = stmt.get(gameId);
  ```
- **Prepared statements are cached.** Prepare a statement once (module-level or class constructor) and reuse it. Do not call `.prepare()` inside a hot loop.
- **Transactions for multi-statement writes.** Use `db.transaction(fn)` for any write that spans more than one statement. This guarantees atomicity and is significantly faster than individual statement commits.
- **No `SELECT *` in production code.** List columns explicitly. `SELECT *` breaks when the schema changes and makes the caller's type contract invisible.

## Type safety

- Define TypeScript types for every row shape (`GameRow`, `MoveAnalysisRow`, `CoachCacheRow`). Map them explicitly from query results — do not cast query results to domain types directly.
- Use zod to validate rows read from the database before converting them to domain types. Database corruption or schema drift should produce a clear zod error, not a runtime `undefined` crash downstream.
- Column naming: `snake_case` in SQL, converted to `camelCase` in TypeScript row types. Define a mapper function per table; do not scatter field renames across query call sites.

## Data model principles

- **Games table**: primary key is the chess.com game **`url`** (`text`) — the stable, globally unique identifier returned by the chess.com API. Do not generate surrogate IDs. Store `createdAt`, `pgn` (or normalized move list), `color`, `result`, `opponentName`, `openingName`, and sync timestamp.
- **MoveAnalysis table**: foreign key to games. One row per analyzed ply. Stores all `MoveAnalysis` fields. Index on `(gameId, ply)`.
- **WeaknessProfile table** (or view): aggregated from `MoveAnalysis`. Can be a materialized cache or a computed view — document the choice.
- **CoachCache table**: stores `(gameId, ply, promptHash, response, modelId, tokenCount, createdAt)`. Indexed on `(gameId, ply, promptHash)`.
- **SyncState table**: stores `(username, lastSyncedAt, lastSyncedYear, lastSyncedMonth)` for incremental chess.com sync. Subsequent syncs resume from the last fetched month rather than re-fetching all archives.

## Error handling

- Database errors are caught at the repository layer and re-thrown as typed application errors (`DatabaseError`, `NotFoundError`). Raw `better-sqlite3` errors never propagate to API route handlers or UI components.
- Failed writes (disk full, locked database) are logged server-side. Surface a generic "Could not save data" message to the user.
- On startup, if the database file cannot be opened (bad path, permissions), the app exits with a clear error message rather than starting in a broken state.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.
