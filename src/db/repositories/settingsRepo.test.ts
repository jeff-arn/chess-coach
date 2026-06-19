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
