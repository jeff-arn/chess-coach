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
