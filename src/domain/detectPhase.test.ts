import { describe, it, expect } from 'vitest';
import { detectPhase } from './detectPhase';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const MIDDLEGAME = 'r2q1rk1/pp2bppp/2n1bn2/2pp4/3P4/2N1PN2/PPQ1BPPP/R1B2RK1 w - - 4 20';
const ENDGAME = '8/5pk1/6p1/8/8/6P1/5PK1/8 w - - 0 40';

describe('detectPhase', () => {
  it('treats the first ten full moves as the opening', () => {
    expect(detectPhase(START)).toBe('opening');
  });
  it('detects a middlegame when many pieces remain past move ten', () => {
    expect(detectPhase(MIDDLEGAME)).toBe('middlegame');
  });
  it('detects an endgame when few non-pawn pieces remain', () => {
    expect(detectPhase(ENDGAME)).toBe('endgame');
  });
});
