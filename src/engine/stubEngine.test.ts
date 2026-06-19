import { describe, it, expect } from 'vitest';
import { StubEngine } from './stubEngine';

describe('StubEngine', () => {
  it('returns the scripted line for a known fen and a default otherwise', async () => {
    const engine = new StubEngine({ 'fen-a': { bestMoveUci: 'e2e4', scoreCp: 30, mate: null } });
    expect(await engine.evaluate('fen-a', 12)).toEqual({ bestMoveUci: 'e2e4', scoreCp: 30, mate: null });
    expect((await engine.evaluate('unknown', 12)).scoreCp).toBe(0);
  });
});
