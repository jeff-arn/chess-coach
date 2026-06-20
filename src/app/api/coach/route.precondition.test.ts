import { describe, it, expect, vi } from 'vitest';
import { openDb } from '@/db/connection';

// A fresh, empty in-memory DB: no weakness profile seeded, so the route hits the
// 409 precondition path. Kept in its own file because vi.mock is hoisted per
// module, and the happy-path test pins its own seeded db in route.test.ts.
const db = openDb(':memory:');

// Pin getDb to the empty in-memory DB so the route sees no analyzed games.
vi.mock('@/db/connection', async (orig) => ({
  ...(await orig<typeof import('@/db/connection')>()),
  getDb: () => db,
}));

import { POST } from './route';

describe('POST /api/coach (no profile)', () => {
  it('returns 409 when there is no analyzed-games profile yet', async () => {
    const res = await POST(new Request('http://localhost/api/coach', { method: 'POST' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('no analyzed games yet');
  });
});
