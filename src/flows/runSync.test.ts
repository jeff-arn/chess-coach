import { describe, it, expect, vi } from 'vitest';
import { runSync } from './runSync';
import { StubEngine } from '@/engine/stubEngine';
import type { GameRow } from '@/db/repositories/gamesRepo';

const games: GameRow[] = [
  {
    id: 'g1',
    playedAt: '2026-01-01T00:00:00Z',
    timeControl: '600',
    userColor: 'white',
    result: 'loss',
    pgn: '1. e4 e5 2. Qh5 Nc6',
  },
];

describe('runSync', () => {
  it('analyzes fetched games and posts a profile', async () => {
    const persist = vi.fn(async () => ({ ok: true as const }));
    const result = await runSync({
      username: 'me',
      engine: new StubEngine(),
      depth: 6,
      fetchGames: async () => games,
      persist,
    });
    expect(result.profile.totalMoves).toBeGreaterThan(0);
    expect(persist).toHaveBeenCalledOnce();
  });

  it('skips a game whose analysis throws and still persists once', async () => {
    const badGame: GameRow[] = [
      {
        id: 'bad',
        playedAt: '2026-01-01T00:00:00Z',
        timeControl: '600',
        userColor: 'white',
        result: 'loss',
        pgn: 'not a pgn',
      },
    ];
    const persist = vi.fn(async () => ({ ok: true as const }));
    const result = await runSync({
      username: 'me',
      engine: new StubEngine(),
      depth: 6,
      fetchGames: async () => badGame,
      persist,
    });
    expect(result.profile.totalMoves).toBe(0);
    expect(persist).toHaveBeenCalledOnce();
  });
});
