import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { analyzeGame } from './analyzeGame';
import { StubEngine } from '@/engine/stubEngine';

function fenAfter(moves: string[]): string {
  const c = new Chess();
  for (const m of moves) c.move(m);
  return c.fen();
}

describe('analyzeGame', () => {
  it('produces one MoveAnalysis per user move with classification and phase', async () => {
    const pgn = '1. e4 e5 2. Qh5 Nc6';
    const startFen = new Chess().fen();
    const afterE4E5 = fenAfter(['e4', 'e5']);
    const engine = new StubEngine({
      [startFen]: { bestMoveUci: 'e2e4', scoreCp: 20, mate: null },
      [afterE4E5]: { bestMoveUci: 'g1f3', scoreCp: 25, mate: null },
    });
    const moves = await analyzeGame(pgn, { engine, username: 'me', userColor: 'white', depth: 8 });
    expect(moves).toHaveLength(2);
    expect(moves[0]?.san).toBe('e4');
    expect(moves[1]?.san).toBe('Qh5');
    expect(moves[1]?.tags).toContain('weakOpening');
  });
});
