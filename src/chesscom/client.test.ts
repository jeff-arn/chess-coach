import { describe, it, expect, vi } from 'vitest';
import { fetchArchiveGames, fetchRapidRating } from './client';

const ARCHIVE = {
  games: [
    { url: 'https://chess.com/game/1', pgn: '1. e4 e5', time_control: '600', end_time: 1735689600,
      white: { username: 'me', result: 'win' }, black: { username: 'foe', result: 'checkmated' } },
  ],
};
function fakeFetch(body: unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(body), { status: 200 })) as unknown as typeof fetch;
}

describe('chess.com client', () => {
  it('maps archive games to GameRow with the user color resolved', async () => {
    const games = await fetchArchiveGames('me', 2025, 1, { fetchImpl: fakeFetch(ARCHIVE) });
    expect(games[0]?.userColor).toBe('white');
    expect(games[0]?.result).toBe('win');
    expect(games[0]?.pgn).toContain('e4');
  });
  it('rejects an invalid username before calling the network', async () => {
    await expect(fetchArchiveGames('bad name!', 2025, 1, { fetchImpl: fakeFetch(ARCHIVE) })).rejects.toThrow();
  });
  it('reads the rapid rating from stats', async () => {
    const stats = { chess_rapid: { last: { rating: 612 } } };
    const r = await fetchRapidRating('me', { fetchImpl: fakeFetch(stats) });
    expect(r).toBe(612);
  });
});
