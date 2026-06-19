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
