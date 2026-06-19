# chess-coach — Plan 2: Analysis Integrations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Tracking lives in beads** — see the Tracking section. The markdown is the implementation reference.

**Goal:** Wire the pure domain core (Plan 1) to the outside world: local SQLite persistence, the chess.com client, a testable Stockfish engine wrapper, the engine-derived weakness taggers, the per-game analysis pipeline, and the `/api/chess-com` + `/api/db` routes. After this plan you can fetch real games, analyze them, and store the results.

**Architecture:** All new code is server- or worker-side. Persistence uses `better-sqlite3` behind small per-table repositories with numbered migrations. External calls (chess.com) sit behind a typed client validated with `zod`. The engine is abstracted behind an `Engine` interface so the pipeline is unit-tested against a deterministic stub; the real Stockfish-WASM-in-a-worker implementation satisfies the same interface. The analysis pipeline composes Plan 1's taggers with engine-derived tags.

**Tech Stack:** `better-sqlite3`, `zod`, `chess.js`, `stockfish` (WASM), Next.js route handlers, Vitest.

**This is Plan 2 of 4.** Depends on Plan 1 (epic `chess-coach-y9v`). Plan 3 = Coaching & Curriculum. Plan 4 = UI & E2E.

**Spec:** `docs/superpowers/specs/2026-06-19-chess-coach-design.md`

## Tracking (beads)

Epic: **`chess-coach-analysis`** (depends on Plan 1 epic). Run `bd ready` for the next
unblocked task. Bead IDs are filled into the table below at import time.

| Task | Depends on |
|------|------------|
| Task 1: Dependencies | Plan 1 complete |
| Task 2: DB connection + migration runner | Task 1 |
| Task 3: Schema migration 001 | Task 2 |
| Task 4: settingsRepo | Task 3 |
| Task 5: gamesRepo | Task 3 |
| Task 6: analysesRepo + profilesRepo | Task 3 |
| Task 7: chess.com client | Task 1 |
| Task 8: Engine interface + stub | Task 1 |
| Task 9: engine-derived taggers | Task 8, Plan 1 |
| Task 10: analyzeGame pipeline | Task 8, 9 |
| Task 11: Stockfish worker impl | Task 8 |
| Task 12: /api/chess-com + /api/db routes | Task 5, 7 |

---

## File Structure (created by this plan)

```
src/
├── db/
│   ├── connection.ts            # better-sqlite3 singleton + pragmas + migrate-on-open
│   ├── connection.test.ts
│   ├── migrations.ts            # ordered migration list + runner
│   ├── migrations.test.ts
│   └── repositories/
│       ├── settingsRepo.ts
│       ├── settingsRepo.test.ts
│       ├── gamesRepo.ts
│       ├── gamesRepo.test.ts
│       ├── analysesRepo.ts
│       ├── profilesRepo.ts
│       └── repositories.test.ts
├── chesscom/
│   ├── types.ts                 # zod schemas + inferred types
│   ├── client.ts                # fetchArchiveGames, fetchRapidRating
│   └── client.test.ts
├── engine/
│   ├── types.ts                 # Engine interface, EngineLine
│   ├── stubEngine.ts            # deterministic test engine
│   ├── stockfishEngine.ts       # real WASM-worker impl (same interface)
│   └── stubEngine.test.ts
├── analysis/
│   ├── deriveTags.ts            # engine-derived weakness tags
│   ├── deriveTags.test.ts
│   ├── analyzeGame.ts           # PGN + Engine -> MoveAnalysis[]
│   └── analyzeGame.test.ts
└── app/api/
    ├── chess-com/route.ts
    ├── chess-com/route.test.ts
    ├── db/route.ts
    └── db/route.test.ts
```

---

## Task 1: Add dependencies

**Files:** Modify `package.json`.

- [ ] **Step 1: Install runtime + dev deps**

Run:
```bash
pnpm add better-sqlite3@11.8.1 stockfish@16.1.0
pnpm add -D @types/better-sqlite3@7.6.12
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck`
Expected: passes (no usages yet).

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add better-sqlite3 and stockfish dependencies"
```

---

## Task 2: DB connection + migration runner

**Files:** Create `src/db/migrations.ts`, `src/db/connection.ts`, `src/db/connection.test.ts`, `src/db/migrations.test.ts`.

- [ ] **Step 1: Write the failing test** (`src/db/connection.test.ts`)

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { openDb } from './connection';
import type { Database } from 'better-sqlite3';

let db: Database;
afterEach(() => db?.close());

describe('openDb', () => {
  it('opens an in-memory db with foreign keys on and migrations applied', () => {
    db = openDb(':memory:');
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get();
    expect(row).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/db/connection.test.ts`
Expected: FAIL — cannot import `openDb`.

- [ ] **Step 3: Implement `src/db/migrations.ts`**

```ts
import type { Database } from 'better-sqlite3';

export type Migration = { id: number; name: string; sql: string };

/** Ordered migrations. Task 3 appends migration 1. */
export const MIGRATIONS: Migration[] = [];

export function runMigrations(db: Database): void {
  // Bound once; better-sqlite3 runs multi-statement DDL through this method.
  const runSql = db.exec.bind(db);
  runSql(
    `CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)`,
  );
  const applied = new Set(
    db.prepare('SELECT id FROM schema_migrations').all().map((r) => (r as { id: number }).id),
  );
  const record = db.prepare('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)');
  const apply = db.transaction((m: Migration) => {
    runSql(m.sql);
    record.run(m.id, m.name, new Date().toISOString());
  });
  for (const m of [...MIGRATIONS].sort((a, b) => a.id - b.id)) {
    if (!applied.has(m.id)) apply(m);
  }
}
```

- [ ] **Step 4: Implement `src/db/connection.ts`**

```ts
import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

let singleton: Database.Database | null = null;

/** Open (or create) a db, set pragmas, and apply migrations. */
export function openDb(path: string): Database.Database {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  return db;
}

/** Process-wide singleton for the app (API routes). Tests use openDb(':memory:'). */
export function getDb(): Database.Database {
  if (singleton) return singleton;
  const path = process.env.CHESS_COACH_DB ?? './chess-coach.db';
  singleton = openDb(path);
  return singleton;
}

export function closeDb(): void {
  singleton?.close();
  singleton = null;
}
```

- [ ] **Step 5: Add `src/db/migrations.test.ts`**

```ts
import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations, MIGRATIONS } from './migrations';

let db: Database.Database;
afterEach(() => db?.close());

describe('runMigrations', () => {
  it('is idempotent — running twice applies each migration once', () => {
    db = new Database(':memory:');
    runMigrations(db);
    runMigrations(db);
    const count = db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get() as { n: number };
    expect(count.n).toBe(MIGRATIONS.length);
  });
});
```

- [ ] **Step 6: Run tests, then commit**

Run: `pnpm vitest run src/db/`
Expected: PASS.
```bash
git add src/db/connection.ts src/db/connection.test.ts src/db/migrations.ts src/db/migrations.test.ts
git commit -m "feat(db): add sqlite connection and migration runner"
```

---

## Task 3: Schema migration 001

**Files:** Modify `src/db/migrations.ts`; add `src/db/schema.test.ts`.

- [ ] **Step 1: Write the failing test** (`src/db/schema.test.ts`)

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { openDb } from './connection';
import type { Database } from 'better-sqlite3';

let db: Database;
afterEach(() => db?.close());

const EXPECTED = [
  'settings', 'games', 'analyses', 'weakness_profiles', 'plans', 'module_progress', 'milestones',
];

describe('schema migration 001', () => {
  it('creates all core tables', () => {
    db = openDb(':memory:');
    const names = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => (r as { name: string }).name),
    );
    for (const t of EXPECTED) expect(names.has(t), `missing table ${t}`).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/db/schema.test.ts`
Expected: FAIL — tables missing.

- [ ] **Step 3: Append migration 001 to `MIGRATIONS` in `src/db/migrations.ts`**

```ts
MIGRATIONS.push({
  id: 1,
  name: 'core_schema',
  sql: `
    CREATE TABLE settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      chesscom_username TEXT,
      target_rating INTEGER,
      coach_brain TEXT NOT NULL DEFAULT 'claude'
    );
    INSERT INTO settings (id) VALUES (1);

    CREATE TABLE games (
      id TEXT PRIMARY KEY,
      played_at TEXT NOT NULL,
      time_control TEXT,
      user_color TEXT NOT NULL CHECK (user_color IN ('white','black')),
      result TEXT NOT NULL,
      pgn TEXT NOT NULL
    );

    CREATE TABLE analyses (
      game_id TEXT PRIMARY KEY REFERENCES games(id) ON DELETE CASCADE,
      analyzed_at TEXT NOT NULL,
      moves_json TEXT NOT NULL
    );

    CREATE TABLE weakness_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      profile_json TEXT NOT NULL
    );

    CREATE TABLE plans (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      updated_at TEXT NOT NULL,
      plan_json TEXT NOT NULL
    );

    CREATE TABLE module_progress (
      module_id TEXT PRIMARY KEY,
      status TEXT NOT NULL CHECK (status IN ('not-started','in-progress','completed')),
      practice_score INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_rating INTEGER NOT NULL,
      target_rating INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active','reached','abandoned')),
      created_at TEXT NOT NULL,
      rating_syncs_json TEXT NOT NULL DEFAULT '[]'
    );
  `,
});
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `pnpm vitest run src/db/schema.test.ts`
Expected: PASS.
```bash
git add src/db/migrations.ts src/db/schema.test.ts
git commit -m "feat(db): add core schema migration"
```

---

## Task 4: settingsRepo

**Files:** Create `src/db/repositories/settingsRepo.ts`, `src/db/repositories/settingsRepo.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { openDb } from '../connection';
import { readSettings, updateSettings } from './settingsRepo';
import type { Database } from 'better-sqlite3';

let db: Database;
afterEach(() => db?.close());

describe('settingsRepo', () => {
  it('returns defaults then persists updates', () => {
    db = openDb(':memory:');
    expect(readSettings(db).coachBrain).toBe('claude');
    updateSettings(db, { chesscomUsername: 'magnus', targetRating: 600 });
    const s = readSettings(db);
    expect(s.chesscomUsername).toBe('magnus');
    expect(s.targetRating).toBe(600);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/db/repositories/settingsRepo.test.ts`
Expected: FAIL — cannot import.

- [ ] **Step 3: Implement `settingsRepo.ts`**

```ts
import type { Database } from 'better-sqlite3';

export type Settings = {
  chesscomUsername: string | null;
  targetRating: number | null;
  coachBrain: string;
};

export function readSettings(db: Database): Settings {
  const row = db
    .prepare('SELECT chesscom_username, target_rating, coach_brain FROM settings WHERE id = 1')
    .get() as { chesscom_username: string | null; target_rating: number | null; coach_brain: string };
  return {
    chesscomUsername: row.chesscom_username,
    targetRating: row.target_rating,
    coachBrain: row.coach_brain,
  };
}

export function updateSettings(
  db: Database,
  patch: Partial<{ chesscomUsername: string; targetRating: number; coachBrain: string }>,
): void {
  db.prepare(
    `UPDATE settings SET
       chesscom_username = COALESCE(@chesscomUsername, chesscom_username),
       target_rating = COALESCE(@targetRating, target_rating),
       coach_brain = COALESCE(@coachBrain, coach_brain)
     WHERE id = 1`,
  ).run({
    chesscomUsername: patch.chesscomUsername ?? null,
    targetRating: patch.targetRating ?? null,
    coachBrain: patch.coachBrain ?? null,
  });
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `pnpm vitest run src/db/repositories/settingsRepo.test.ts`
Expected: PASS.
```bash
git add src/db/repositories/settingsRepo.ts src/db/repositories/settingsRepo.test.ts
git commit -m "feat(db): add settings repository"
```

---

## Task 5: gamesRepo

**Files:** Create `src/db/repositories/gamesRepo.ts`, `src/db/repositories/gamesRepo.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { openDb } from '../connection';
import { upsertGame, listGames, type GameRow } from './gamesRepo';
import type { Database } from 'better-sqlite3';

let db: Database;
afterEach(() => db?.close());

function game(id: string, playedAt: string): GameRow {
  return { id, playedAt, timeControl: '600', userColor: 'white', result: 'loss', pgn: '1. e4 e5' };
}

describe('gamesRepo', () => {
  it('upserts idempotently and lists newest-first', () => {
    db = openDb(':memory:');
    upsertGame(db, game('g1', '2026-01-01T00:00:00Z'));
    upsertGame(db, game('g1', '2026-01-01T00:00:00Z')); // duplicate id, no error
    upsertGame(db, game('g2', '2026-02-01T00:00:00Z'));
    const games = listGames(db, 10);
    expect(games.map((g) => g.id)).toEqual(['g2', 'g1']);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/db/repositories/gamesRepo.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `gamesRepo.ts`**

```ts
import type { Database } from 'better-sqlite3';

export type GameRow = {
  id: string;
  playedAt: string;
  timeControl: string | null;
  userColor: 'white' | 'black';
  result: string;
  pgn: string;
};

export function upsertGame(db: Database, g: GameRow): void {
  db.prepare(
    `INSERT INTO games (id, played_at, time_control, user_color, result, pgn)
     VALUES (@id, @playedAt, @timeControl, @userColor, @result, @pgn)
     ON CONFLICT(id) DO UPDATE SET
       played_at=excluded.played_at, time_control=excluded.time_control,
       user_color=excluded.user_color, result=excluded.result, pgn=excluded.pgn`,
  ).run(g);
}

export function listGames(db: Database, limit: number): GameRow[] {
  return db
    .prepare(
      `SELECT id, played_at AS playedAt, time_control AS timeControl,
              user_color AS userColor, result, pgn
       FROM games ORDER BY played_at DESC LIMIT ?`,
    )
    .all(limit) as GameRow[];
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `pnpm vitest run src/db/repositories/gamesRepo.test.ts`
Expected: PASS.
```bash
git add src/db/repositories/gamesRepo.ts src/db/repositories/gamesRepo.test.ts
git commit -m "feat(db): add games repository"
```

---

## Task 6: analysesRepo + profilesRepo

**Files:** Create `src/db/repositories/analysesRepo.ts`, `src/db/repositories/profilesRepo.ts`, `src/db/repositories/repositories.test.ts`.

- [ ] **Step 1: Write the failing test** (`repositories.test.ts`)

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { openDb } from '../connection';
import { upsertGame } from './gamesRepo';
import { saveAnalysis, getAnalysis } from './analysesRepo';
import { saveProfile, latestProfile } from './profilesRepo';
import type { Database } from 'better-sqlite3';
import type { MoveAnalysis, WeaknessProfile } from '@/domain/types';

let db: Database;
afterEach(() => db?.close());

describe('analysesRepo + profilesRepo', () => {
  it('round-trips an analysis keyed to a game', () => {
    db = openDb(':memory:');
    upsertGame(db, { id: 'g1', playedAt: '2026-01-01T00:00:00Z', timeControl: '600', userColor: 'white', result: 'loss', pgn: '1. e4' });
    const moves: MoveAnalysis[] = [];
    saveAnalysis(db, 'g1', moves);
    expect(getAnalysis(db, 'g1')).toEqual(moves);
  });

  it('returns the most recently saved weakness profile', () => {
    db = openDb(':memory:');
    const a = { totalMoves: 1 } as WeaknessProfile;
    const b = { totalMoves: 2 } as WeaknessProfile;
    saveProfile(db, a);
    saveProfile(db, b);
    expect(latestProfile(db)?.totalMoves).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/db/repositories/repositories.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `analysesRepo.ts`**

```ts
import type { Database } from 'better-sqlite3';
import type { MoveAnalysis } from '@/domain/types';

export function saveAnalysis(db: Database, gameId: string, moves: MoveAnalysis[]): void {
  db.prepare(
    `INSERT INTO analyses (game_id, analyzed_at, moves_json) VALUES (?, ?, ?)
     ON CONFLICT(game_id) DO UPDATE SET analyzed_at=excluded.analyzed_at, moves_json=excluded.moves_json`,
  ).run(gameId, new Date().toISOString(), JSON.stringify(moves));
}

export function getAnalysis(db: Database, gameId: string): MoveAnalysis[] | null {
  const row = db.prepare('SELECT moves_json FROM analyses WHERE game_id = ?').get(gameId) as
    | { moves_json: string }
    | undefined;
  return row ? (JSON.parse(row.moves_json) as MoveAnalysis[]) : null;
}
```

- [ ] **Step 4: Implement `profilesRepo.ts`**

```ts
import type { Database } from 'better-sqlite3';
import type { WeaknessProfile } from '@/domain/types';

export function saveProfile(db: Database, profile: WeaknessProfile): void {
  db.prepare('INSERT INTO weakness_profiles (created_at, profile_json) VALUES (?, ?)').run(
    new Date().toISOString(),
    JSON.stringify(profile),
  );
}

export function latestProfile(db: Database): WeaknessProfile | null {
  const row = db
    .prepare('SELECT profile_json FROM weakness_profiles ORDER BY id DESC LIMIT 1')
    .get() as { profile_json: string } | undefined;
  return row ? (JSON.parse(row.profile_json) as WeaknessProfile) : null;
}
```

- [ ] **Step 5: Run to verify it passes, then commit**

Run: `pnpm vitest run src/db/repositories/repositories.test.ts`
Expected: PASS.
```bash
git add src/db/repositories/analysesRepo.ts src/db/repositories/profilesRepo.ts src/db/repositories/repositories.test.ts
git commit -m "feat(db): add analyses and weakness-profile repositories"
```

---

## Task 7: chess.com client

**Files:** Create `src/chesscom/types.ts`, `src/chesscom/client.ts`, `src/chesscom/client.test.ts`.

The chess.com Published-Data API is public/read-only. Monthly archives:
`https://api.chess.com/pub/player/{user}/games/{YYYY}/{MM}`; player stats (rating):
`https://api.chess.com/pub/player/{user}/stats`. Requests must send a descriptive
`User-Agent`. See `.claude/rules/external-apis.md`.

- [ ] **Step 1: Write the failing test** (inject a `fetch` for determinism)

```ts
import { describe, it, expect, vi } from 'vitest';
import { fetchArchiveGames, fetchRapidRating } from './client';

const ARCHIVE = {
  games: [
    {
      url: 'https://chess.com/game/1',
      pgn: '1. e4 e5',
      time_control: '600',
      end_time: 1735689600,
      white: { username: 'me', result: 'win' },
      black: { username: 'foe', result: 'checkmated' },
    },
  ],
};

function fakeFetch(body: unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;
}

describe('chess.com client', () => {
  it('maps archive games to GameRow with the user color resolved', async () => {
    const games = await fetchArchiveGames('me', 2025, 1, { fetchImpl: fakeFetch(ARCHIVE) });
    expect(games[0]?.userColor).toBe('white');
    expect(games[0]?.result).toBe('win');
    expect(games[0]?.pgn).toContain('e4');
  });

  it('rejects an invalid username before calling the network', async () => {
    await expect(fetchArchiveGames('bad name!', 2025, 1, { fetchImpl: fakeFetch(ARCHIVE) })).rejects.toThrow();
  });

  it('reads the rapid rating from stats', async () => {
    const stats = { chess_rapid: { last: { rating: 612 } } };
    const r = await fetchRapidRating('me', { fetchImpl: fakeFetch(stats) });
    expect(r).toBe(612);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/chesscom/client.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `types.ts`**

```ts
import { z } from 'zod';

export const USERNAME_RE = /^[A-Za-z0-9_-]{1,32}$/;

export const archiveGameSchema = z.object({
  url: z.string(),
  pgn: z.string(),
  time_control: z.string().optional(),
  end_time: z.number(),
  white: z.object({ username: z.string(), result: z.string() }),
  black: z.object({ username: z.string(), result: z.string() }),
});

export const archiveSchema = z.object({ games: z.array(archiveGameSchema) });

export const statsSchema = z.object({
  chess_rapid: z.object({ last: z.object({ rating: z.number() }) }).optional(),
});

export type ArchiveGame = z.infer<typeof archiveGameSchema>;
```

- [ ] **Step 4: Implement `client.ts`**

```ts
import { archiveSchema, statsSchema, USERNAME_RE } from './types';
import type { GameRow } from '@/db/repositories/gamesRepo';

const UA = 'chess-coach/0.1 (local single-user app)';
const BASE = 'https://api.chess.com/pub';

type Opts = { fetchImpl?: typeof fetch; timeoutMs?: number };

async function getJson(url: string, opts: Opts): Promise<unknown> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  try {
    const res = await fetchImpl(url, { headers: { 'User-Agent': UA }, signal: controller.signal });
    if (!res.ok) throw new Error(`chess.com ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function assertUsername(user: string): void {
  if (!USERNAME_RE.test(user)) throw new Error(`invalid chess.com username: ${user}`);
}

export async function fetchArchiveGames(
  user: string,
  year: number,
  month: number,
  opts: Opts = {},
): Promise<GameRow[]> {
  assertUsername(user);
  const mm = String(month).padStart(2, '0');
  const json = await getJson(`${BASE}/player/${user}/games/${year}/${mm}`, opts);
  const { games } = archiveSchema.parse(json);
  const lower = user.toLowerCase();
  return games.map((g) => {
    const userColor = g.white.username.toLowerCase() === lower ? 'white' : 'black';
    const side = userColor === 'white' ? g.white : g.black;
    return {
      id: g.url,
      playedAt: new Date(g.end_time * 1000).toISOString(),
      timeControl: g.time_control ?? null,
      userColor,
      result: side.result,
      pgn: g.pgn,
    };
  });
}

export async function fetchRapidRating(user: string, opts: Opts = {}): Promise<number | null> {
  assertUsername(user);
  const json = await getJson(`${BASE}/player/${user}/stats`, opts);
  const stats = statsSchema.parse(json);
  return stats.chess_rapid?.last.rating ?? null;
}
```

- [ ] **Step 5: Run to verify it passes, then commit**

Run: `pnpm vitest run src/chesscom/client.test.ts`
Expected: PASS (3 tests).
```bash
git add src/chesscom
git commit -m "feat(chesscom): add public-data client for games and rating"
```

---

## Task 8: Engine interface + stub

**Files:** Create `src/engine/types.ts`, `src/engine/stubEngine.ts`, `src/engine/stubEngine.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { StubEngine } from './stubEngine';

describe('StubEngine', () => {
  it('returns the scripted line for a known fen and a default otherwise', async () => {
    const engine = new StubEngine({
      'fen-a': { bestMoveUci: 'e2e4', scoreCp: 30, mate: null },
    });
    expect(await engine.evaluate('fen-a', 12)).toEqual({ bestMoveUci: 'e2e4', scoreCp: 30, mate: null });
    expect((await engine.evaluate('unknown', 12)).scoreCp).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/engine/stubEngine.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `types.ts`**

```ts
/** A single engine evaluation line for the side to move in a position. */
export type EngineLine = {
  bestMoveUci: string;
  scoreCp: number; // centipawns, from the side-to-move's perspective
  mate: number | null; // moves-to-mate if forced, else null
};

export interface Engine {
  evaluate(fen: string, depth: number): Promise<EngineLine>;
}
```

- [ ] **Step 4: Implement `stubEngine.ts`**

```ts
import type { Engine, EngineLine } from './types';

const DEFAULT_LINE: EngineLine = { bestMoveUci: '0000', scoreCp: 0, mate: null };

/** Deterministic engine for tests: scripted lines keyed by FEN. */
export class StubEngine implements Engine {
  constructor(private readonly lines: Record<string, EngineLine> = {}) {}
  async evaluate(fen: string): Promise<EngineLine> {
    return this.lines[fen] ?? DEFAULT_LINE;
  }
}
```

- [ ] **Step 5: Run to verify it passes, then commit**

Run: `pnpm vitest run src/engine/stubEngine.test.ts`
Expected: PASS.
```bash
git add src/engine/types.ts src/engine/stubEngine.ts src/engine/stubEngine.test.ts
git commit -m "feat(engine): add Engine interface and deterministic stub"
```

---

## Task 9: engine-derived taggers

**Files:** Create `src/analysis/deriveTags.ts`, `src/analysis/deriveTags.test.ts`.

Combines Plan 1's position taggers with engine facts. Definitions:
- `hangsPieces`: `detectHangingPiece(fenAfter)` — the user's move leaves the opponent a winning capture.
- `missesTactics`: `detectHangingPiece(fenBefore)` (a winning capture was available) **and** `cpLoss >= 100` (didn't play it).
- `missesMates`: the best line was a forced mate (`mate > 0`) **and** `cpLoss >= 200`.
- `ignoresThreats`: `hangsPieces` is true, the played move was **not** a capture, and `cpLoss >= 200` (a passive move that ignored the position).
- `weakOpening`: delegated to Plan 1's `detectWeakOpening(fenBefore, san, ply)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { deriveTags } from './deriveTags';
import type { EngineLine } from '@/engine/types';

// Black queen hanging on d4; white (user) to move. User plays a quiet move (Nf3),
// ignoring the free queen -> missesTactics (winning capture was available).
const FEN_FREE_QUEEN = 'rnb1kbnr/pppp1ppp/8/8/3q4/4P3/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
const FEN_AFTER_QUIET = 'rnb1kbnr/pppp1ppp/8/8/3q4/4P2N/PPPP1PPP/RNBQKB1R b KQkq - 1 1';
const line: EngineLine = { bestMoveUci: 'e3d4', scoreCp: 900, mate: null };

describe('deriveTags', () => {
  it('flags missesTactics when a winning capture was available and not played', () => {
    const tags = deriveTags({
      fenBefore: FEN_FREE_QUEEN,
      fenAfter: FEN_AFTER_QUIET,
      san: 'Nf3',
      ply: 3,
      cpLoss: 850,
      line,
      wasCapture: false,
    });
    expect(tags).toContain('missesTactics');
  });

  it('returns no tags for a best move with zero loss', () => {
    const tags = deriveTags({
      fenBefore: FEN_FREE_QUEEN,
      fenAfter: FEN_FREE_QUEEN,
      san: 'exd4',
      ply: 3,
      cpLoss: 0,
      line,
      wasCapture: true,
    });
    expect(tags).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/analysis/deriveTags.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `deriveTags.ts`**

```ts
import { detectHangingPiece } from '@/domain/taggers/hangingPiece';
import { detectWeakOpening } from '@/domain/taggers/weakOpening';
import type { WeaknessTag } from '@/domain/types';
import type { EngineLine } from '@/engine/types';

export type DeriveInput = {
  fenBefore: string;
  fenAfter: string;
  san: string;
  ply: number;
  cpLoss: number;
  line: EngineLine;
  wasCapture: boolean;
};

export function deriveTags(input: DeriveInput): WeaknessTag[] {
  const tags = new Set<WeaknessTag>();
  const { fenBefore, fenAfter, san, ply, cpLoss, line, wasCapture } = input;

  if (detectHangingPiece(fenAfter)) tags.add('hangsPieces');
  if (detectHangingPiece(fenBefore) && cpLoss >= 100) tags.add('missesTactics');
  if (line.mate !== null && line.mate > 0 && cpLoss >= 200) tags.add('missesMates');
  if (tags.has('hangsPieces') && !wasCapture && cpLoss >= 200) tags.add('ignoresThreats');
  if (detectWeakOpening(fenBefore, san, ply)) tags.add('weakOpening');

  return [...tags];
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `pnpm vitest run src/analysis/deriveTags.test.ts`
Expected: PASS.
```bash
git add src/analysis/deriveTags.ts src/analysis/deriveTags.test.ts
git commit -m "feat(analysis): derive weakness tags from engine + position"
```

---

## Task 10: analyzeGame pipeline

**Files:** Create `src/analysis/analyzeGame.ts`, `src/analysis/analyzeGame.test.ts`.

Walks a PGN, evaluates each of the user's positions with the `Engine`, computes
centipawn loss (best score minus the negated post-move score), classifies, detects
phase, and derives tags. The `endgame` phase additionally adds `weakEndgame` when the
move is a mistake-or-worse.

- [ ] **Step 1: Write the failing test** (stub engine scripted for a tiny game)

```ts
import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { analyzeGame } from './analyzeGame';
import { StubEngine } from '@/engine/stubEngine';

function fenAfter(moves: string[]): string {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c.fen();
}

describe('analyzeGame', () => {
  it('produces one MoveAnalysis per user move with classification and phase', async () => {
    const pgn = '1. e4 e5 2. Qh5 Nc6';
    const startFen = new Chess().fen();
    const afterE4E5 = fenAfter(['e4', 'e5']);
    const engine = new StubEngine({
      [startFen]: { bestMoveUci: 'e2e4', scoreCp: 20, mate: null },
      [afterE4E5]: { bestMoveUci: 'g1f3', scoreCp: 25, mate: null }, // best was Nf3, user played Qh5
    });

    const moves = await analyzeGame(pgn, { engine, username: 'me', userColor: 'white', depth: 8 });

    expect(moves).toHaveLength(2); // two white moves
    expect(moves[0]?.san).toBe('e4');
    expect(moves[1]?.san).toBe('Qh5');
    expect(moves[1]?.tags).toContain('weakOpening');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/analysis/analyzeGame.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `analyzeGame.ts`**

```ts
import { Chess } from 'chess.js';
import { classifyMove } from '@/domain/classifyMove';
import { detectPhase } from '@/domain/detectPhase';
import type { MoveAnalysis, PieceColor, WeaknessTag } from '@/domain/types';
import { deriveTags } from './deriveTags';
import type { Engine } from '@/engine/types';

export type AnalyzeOpts = {
  engine: Engine;
  username: string;
  userColor: PieceColor;
  depth: number;
};

function uciToSan(fen: string, uci: string): string {
  if (uci.length < 4) return uci;
  const c = new Chess(fen);
  try {
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
    return m.san;
  } catch {
    return uci;
  }
}

/** Analyze every move the user played in a PGN. */
export async function analyzeGame(pgn: string, opts: AnalyzeOpts): Promise<MoveAnalysis[]> {
  const { engine, userColor, depth } = opts;
  const colorLetter = userColor === 'white' ? 'w' : 'b';

  const replay = new Chess();
  replay.loadPgn(pgn);
  const history = replay.history({ verbose: true });

  const board = new Chess();
  const out: MoveAnalysis[] = [];
  let ply = 0;

  for (const h of history) {
    ply += 1;
    const fenBefore = board.fen();
    const isUserMove = h.color === colorLetter;

    if (isUserMove) {
      const best = await engine.evaluate(fenBefore, depth);
      board.move(h.san);
      const fenAfter = board.fen();
      const after = await engine.evaluate(fenAfter, depth);
      const playedScore = -after.scoreCp; // flip perspective back to the user
      const cpLoss = Math.max(0, best.scoreCp - playedScore);
      const phase = detectPhase(fenBefore);
      const moveClass = classifyMove(cpLoss);

      const tags: WeaknessTag[] = deriveTags({
        fenBefore,
        fenAfter,
        san: h.san,
        ply,
        cpLoss,
        line: best,
        wasCapture: Boolean(h.captured),
      });
      if (phase === 'endgame' && (moveClass === 'mistake' || moveClass === 'blunder')) {
        if (!tags.includes('weakEndgame')) tags.push('weakEndgame');
      }

      out.push({
        ply,
        fenBefore,
        fenAfter,
        san: h.san,
        bestSan: uciToSan(fenBefore, best.bestMoveUci),
        cpLoss,
        moveClass,
        phase,
        tags,
      });
    } else {
      board.move(h.san);
    }
  }

  return out;
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `pnpm vitest run src/analysis/analyzeGame.test.ts`
Expected: PASS.
```bash
git add src/analysis/analyzeGame.ts src/analysis/analyzeGame.test.ts
git commit -m "feat(analysis): add per-game analysis pipeline"
```

---

## Task 11: Stockfish worker implementation

**Files:** Create `src/engine/stockfishEngine.ts`. No unit test (it drives a real WASM
worker; it is exercised by the Plan 4 E2E "engine smoke" test). It must satisfy the
`Engine` interface so the pipeline is unaffected.

- [ ] **Step 1: Implement `stockfishEngine.ts`**

```ts
'use client';

import type { Engine, EngineLine } from './types';

/**
 * Stockfish-WASM engine running in a Web Worker. Parses UCI `info`/`bestmove`
 * output. Fixed depth per call for reproducible evaluations (see
 * .claude/rules/engine-analysis.md). Browser-only.
 */
export class StockfishEngine implements Engine {
  private worker: Worker;

  constructor() {
    // `stockfish` ships a worker script; resolve its URL via the bundler.
    this.worker = new Worker(new URL('stockfish/src/stockfish.js', import.meta.url));
    this.worker.postMessage('uci');
  }

  evaluate(fen: string, depth: number): Promise<EngineLine> {
    return new Promise((resolve) => {
      let lastScoreCp = 0;
      let lastMate: number | null = null;

      const onMessage = (e: MessageEvent<string>) => {
        const line = typeof e.data === 'string' ? e.data : '';
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);
        if (cp?.[1]) lastScoreCp = Number(cp[1]);
        if (mate?.[1]) lastMate = Number(mate[1]);
        const best = line.match(/^bestmove (\S+)/);
        if (best?.[1]) {
          this.worker.removeEventListener('message', onMessage);
          resolve({ bestMoveUci: best[1], scoreCp: lastScoreCp, mate: lastMate });
        }
      };

      this.worker.addEventListener('message', onMessage);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }

  dispose(): void {
    this.worker.terminate();
  }
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `pnpm typecheck`
Expected: passes. (If the bundler cannot resolve the worker URL at build time, adjust
the path to the installed `stockfish` entry; document the resolved path in a comment.)
```bash
git add src/engine/stockfishEngine.ts
git commit -m "feat(engine): add stockfish wasm worker implementation"
```

---

## Task 12: `/api/chess-com` and `/api/db` routes

**Files:** Create `src/app/api/chess-com/route.ts`, `route.test.ts`, `src/app/api/db/route.ts`, `route.test.ts`.

`/api/chess-com` (GET `?user=&year=&month=`) fetches and returns mapped games, and on
`?stats=1` returns the rating. `/api/db` exposes settings read/update and games list
for the client (so the browser never touches SQLite directly).

- [ ] **Step 1: Write the failing test** (`chess-com/route.test.ts`)

```ts
import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';

vi.mock('@/chesscom/client', () => ({
  fetchArchiveGames: vi.fn(async () => [{ id: 'g1', playedAt: 'x', timeControl: '600', userColor: 'white', result: 'win', pgn: '1. e4' }]),
  fetchRapidRating: vi.fn(async () => 612),
}));

describe('GET /api/chess-com', () => {
  it('returns games for a valid user', async () => {
    const res = await GET(new Request('http://localhost/api/chess-com?user=me&year=2025&month=1'));
    expect(res.status).toBe(200);
    expect((await res.json()).games[0].id).toBe('g1');
  });

  it('400s on a missing user', async () => {
    const res = await GET(new Request('http://localhost/api/chess-com?year=2025&month=1'));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/app/api/chess-com/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `chess-com/route.ts`**

```ts
import { fetchArchiveGames, fetchRapidRating } from '@/chesscom/client';

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  if (!user) return Response.json({ error: 'user is required' }, { status: 400 });

  try {
    if (url.searchParams.get('stats') === '1') {
      return Response.json({ rating: await fetchRapidRating(user) });
    }
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month'));
    if (!year || !month) return Response.json({ error: 'year and month required' }, { status: 400 });
    return Response.json({ games: await fetchArchiveGames(user, year, month) });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
```

- [ ] **Step 4: Implement `db/route.ts` + its test**

`db/route.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openDb } from '@/db/connection';

const db = openDb(':memory:');
vi.mock('@/db/connection', async (orig) => ({ ...(await orig<typeof import('@/db/connection')>()), getDb: () => db }));

import { GET, POST } from './route';

beforeEach(() => db.prepare('UPDATE settings SET chesscom_username=NULL, target_rating=NULL WHERE id=1').run());

describe('/api/db settings', () => {
  it('updates and reads settings', async () => {
    const post = await POST(new Request('http://localhost/api/db', { method: 'POST', body: JSON.stringify({ kind: 'settings', patch: { chesscomUsername: 'me', targetRating: 600 } }) }));
    expect(post.status).toBe(200);
    const get = await GET(new Request('http://localhost/api/db?kind=settings'));
    expect((await get.json()).chesscomUsername).toBe('me');
  });
});
```

`db/route.ts`:

```ts
import { getDb } from '@/db/connection';
import { readSettings, updateSettings } from '@/db/repositories/settingsRepo';
import { listGames } from '@/db/repositories/gamesRepo';

export async function GET(req: Request): Promise<Response> {
  const kind = new URL(req.url).searchParams.get('kind');
  const db = getDb();
  if (kind === 'settings') return Response.json(readSettings(db));
  if (kind === 'games') return Response.json({ games: listGames(db, 50) });
  return Response.json({ error: 'unknown kind' }, { status: 400 });
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as { kind: string; patch?: Record<string, unknown> };
  const db = getDb();
  if (body.kind === 'settings' && body.patch) {
    updateSettings(db, body.patch);
    return Response.json({ ok: true });
  }
  return Response.json({ error: 'unknown kind' }, { status: 400 });
}
```

- [ ] **Step 5: Run all route tests, full suite, typecheck, lint, then commit**

Run: `pnpm test:run && pnpm typecheck && pnpm lint`
Expected: all pass.
```bash
git add src/app/api
git commit -m "feat(api): add chess-com and db route handlers"
```

---

## Done criteria for Plan 2

- `pnpm test:run`, `pnpm typecheck`, `pnpm lint` all pass.
- SQLite persistence works through migrations + repositories; games and analyses
  round-trip; weakness profiles are dated.
- The chess.com client fetches and maps games + rating with username validation.
- `analyzeGame` turns a PGN + `Engine` into `MoveAnalysis[]`; the real Stockfish
  worker satisfies the same `Engine` interface.
- `/api/chess-com` and `/api/db` work and are tested with mocked dependencies.

**Next:** Plan 3 — Coaching & Curriculum (Coach interface, rules-based + Claude coaches
with fallback, curriculum content + loader, milestones/progress, `/api/coach`).
