import { describe, it, expect, afterEach } from 'vitest';
import { openDb } from '../connection';
import { completedModuleIds } from './moduleProgressRepo';
import type { Database } from 'better-sqlite3';

let db: Database;
afterEach(() => db?.close());

function insertProgress(db: Database, moduleId: string, status: string): void {
  db.prepare(
    'INSERT INTO module_progress (module_id, status, practice_score, updated_at) VALUES (?,?,?,?)',
  ).run(moduleId, status, 0, '2026-01-01T00:00:00Z');
}

describe('moduleProgressRepo', () => {
  it('returns an empty array when no progress rows exist', () => {
    db = openDb(':memory:');
    expect(completedModuleIds(db)).toEqual([]);
  });

  it('returns only the module ids with status completed', () => {
    db = openDb(':memory:');
    insertProgress(db, 'm1', 'completed');
    insertProgress(db, 'm2', 'in-progress');
    insertProgress(db, 'm3', 'completed');
    insertProgress(db, 'm4', 'not-started');

    expect(completedModuleIds(db).sort()).toEqual(['m1', 'm3']);
  });
});
