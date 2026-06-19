import { describe, it, expect, vi } from 'vitest';
import { openDb } from '@/db/connection';

const db = openDb(':memory:');
db.prepare('INSERT INTO weakness_profiles (created_at, profile_json) VALUES (?, ?)').run(
  '2026-01-01T00:00:00Z',
  JSON.stringify({
    totalMoves: 10,
    averageCpLoss: 100,
    classCounts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    examples: {},
    tagFrequency: {
      hangsPieces: 0.6,
      missesTactics: 0,
      missesMates: 0,
      weakOpening: 0,
      weakEndgame: 0,
      ignoresThreats: 0,
    },
  }),
);
db.prepare('UPDATE settings SET chesscom_username=?, target_rating=?, coach_brain=? WHERE id=1').run(
  'me',
  600,
  'rules',
);

// Pin getDb to an in-memory DB so the route reads our seeded profile/settings without a real file DB.
vi.mock('@/db/connection', async (orig) => ({
  ...(await orig<typeof import('@/db/connection')>()),
  getDb: () => db,
}));

import { POST } from './route';

describe('POST /api/coach', () => {
  it('returns a plan built from the latest profile and curriculum', async () => {
    const res = await POST(new Request('http://localhost/api/coach', { method: 'POST' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan.modules.length).toBeGreaterThan(0);
    // coach_brain='rules' makes the rules coach the *primary*; it succeeds, so no fallback occurs.
    expect(body.usedFallback).toBe(false);
  });
});
