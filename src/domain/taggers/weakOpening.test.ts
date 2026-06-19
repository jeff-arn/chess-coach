import { describe, it, expect } from 'vitest';
import { detectWeakOpening } from './weakOpening';

describe('detectWeakOpening', () => {
  it('flags an early queen sortie in the opening', () => {
    const fenBefore = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(detectWeakOpening(fenBefore, 'Qh5', 3)).toBe(true);
  });
  it('does not flag a normal developing move', () => {
    const fenBefore = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(detectWeakOpening(fenBefore, 'Nf3', 3)).toBe(false);
  });
  it('never flags once past the opening window', () => {
    const fenBefore = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(detectWeakOpening(fenBefore, 'Qh5', 21)).toBe(false);
  });
});
