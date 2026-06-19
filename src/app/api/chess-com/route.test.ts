import { describe, it, expect, vi } from 'vitest';
import { GET } from './route';

vi.mock('@/chesscom/client', () => ({
  fetchArchiveGames: vi.fn(async () => [{ id: 'g1', playedAt: 'x', timeControl: '600', userColor: 'white', result: 'win', pgn: '1. e4' }]),
  fetchRapidRating: vi.fn(async () => 612),
}));

describe('GET /api/chess-com', () => {
  it('returns games for a valid user', async () => {
    const res = await GET(new Request('http://localhost/api/chess-com?user=me&year=2025&month=1'));
    expect(res.status).toBe(200);
    expect((await res.json()).games[0].id).toBe('g1');
  });
  it('400s on a missing user', async () => {
    const res = await GET(new Request('http://localhost/api/chess-com?year=2025&month=1'));
    expect(res.status).toBe(400);
  });
});
