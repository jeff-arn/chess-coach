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
