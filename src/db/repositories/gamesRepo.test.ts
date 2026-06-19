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
    upsertGame(db, game('g1', '2026-01-01T00:00:00Z'));
    upsertGame(db, game('g2', '2026-02-01T00:00:00Z'));
    const games = listGames(db, 10);
    expect(games.map((g) => g.id)).toEqual(['g2', 'g1']);
  });
});
