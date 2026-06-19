import type { Database } from 'better-sqlite3';

export type Migration = { id: number; name: string; sql: string };

/** Ordered migrations. Task 3 appends migration 1. */
export const MIGRATIONS: Migration[] = [];

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
