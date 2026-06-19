import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db/connection', async (orig) => {
  const actual = await orig<typeof import('@/db/connection')>();
  const testDb = actual.openDb(':memory:');
  return { ...actual, getDb: () => testDb };
});

import { getDb } from '@/db/connection';
import { GET, POST } from './route';

beforeEach(() => {
  getDb().prepare('UPDATE settings SET chesscom_username=NULL, target_rating=NULL WHERE id=1').run();
});

describe('/api/db settings', () => {
  it('updates and reads settings', async () => {
    const post = await POST(
      new Request('http://localhost/api/db', {
        method: 'POST',
        body: JSON.stringify({ kind: 'settings', patch: { chesscomUsername: 'me', targetRating: 600 } }),
      }),
    );
    expect(post.status).toBe(200);
    const get = await GET(new Request('http://localhost/api/db?kind=settings'));
    expect((await get.json()).chesscomUsername).toBe('me');
  });

  it('400s on an unknown kind', async () => {
    const res = await GET(new Request('http://localhost/api/db?kind=bogus'));
    expect(res.status).toBe(400);
  });
});
