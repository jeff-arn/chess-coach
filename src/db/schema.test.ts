import { describe, it, expect, afterEach } from 'vitest';
import { openDb } from './connection';
import type { Database } from 'better-sqlite3';

let db: Database;
afterEach(() => db?.close());

const EXPECTED = ['settings', 'games', 'analyses', 'weakness_profiles', 'plans', 'module_progress', 'milestones'];

describe('schema migration 001', () => {
  it('creates all core tables', () => {
    db = openDb(':memory:');
    const names = new Set(
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => (r as { name: string }).name),
    );
    for (const t of EXPECTED) expect(names.has(t), `missing table ${t}`).toBe(true);
  });
});
