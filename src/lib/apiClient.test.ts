// Rule exception (.claude/rules/testing.md + external-apis.md: "never mock fetch directly").
// That rule targets the EXTERNAL service client seams; apiClient is the app's own same-origin
// API wrapper and IS the boundary under test — there is no lower seam, and spying on fetch is
// the only way to assert URL/method/body construction.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { getSettings, updateSettings } from './apiClient';

afterEach(() => vi.restoreAllMocks());

describe('apiClient', () => {
  it('GETs settings', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ chesscomUsername: 'me', targetRating: 600, coachBrain: 'claude' })),
    );
    expect((await getSettings()).chesscomUsername).toBe('me');
  });

  it('POSTs a settings patch', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    await updateSettings({ targetRating: 800 });
    expect(spy).toHaveBeenCalledWith('/api/db', expect.objectContaining({ method: 'POST' }));
  });

  it('rejects when the response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(getSettings()).rejects.toThrow();
  });
});
