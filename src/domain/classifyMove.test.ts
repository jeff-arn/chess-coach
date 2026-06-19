import { describe, it, expect } from 'vitest';
import { classifyMove } from './classifyMove';

describe('classifyMove', () => {
  it('returns best for zero or tiny centipawn loss', () => {
    expect(classifyMove(0)).toBe('best');
    expect(classifyMove(10)).toBe('best');
  });
  it('returns good just above the best threshold and at the good boundary', () => {
    expect(classifyMove(11)).toBe('good');
    expect(classifyMove(50)).toBe('good');
  });
  it('returns inaccuracy, mistake, and blunder across their ranges', () => {
    expect(classifyMove(51)).toBe('inaccuracy');
    expect(classifyMove(100)).toBe('inaccuracy');
    expect(classifyMove(101)).toBe('mistake');
    expect(classifyMove(200)).toBe('mistake');
    expect(classifyMove(201)).toBe('blunder');
    expect(classifyMove(5000)).toBe('blunder');
  });
  it('clamps negative losses (engine noise) to best', () => {
    expect(classifyMove(-30)).toBe('best');
  });
});
