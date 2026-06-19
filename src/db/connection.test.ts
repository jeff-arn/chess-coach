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
