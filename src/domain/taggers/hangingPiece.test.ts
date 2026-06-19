import { describe, it, expect } from 'vitest';
import { detectHangingPiece } from './hangingPiece';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const QUEEN_ENPRISE = 'rnb1kbnr/pppp1ppp/8/8/3q4/4P3/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
const NOTHING_HANGS = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

describe('detectHangingPiece', () => {
  it('returns false for the starting position', () => {
    expect(detectHangingPiece(START)).toBe(false);
  });
  it('returns true when an undefended high-value piece can be captured', () => {
    expect(detectHangingPiece(QUEEN_ENPRISE)).toBe(true);
  });
  it('returns false in a developed position with no free captures', () => {
    expect(detectHangingPiece(NOTHING_HANGS)).toBe(false);
  });
});
