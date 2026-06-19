import { describe, it, expect } from 'vitest';
import { aggregateProfile } from './aggregateProfile';
import type { MoveAnalysis } from './types';

function move(partial: Partial<MoveAnalysis>): MoveAnalysis {
  return {
    ply: 1, fenBefore: 'startpos', fenAfter: 'startpos', san: 'e4', bestSan: 'e4',
    cpLoss: 0, moveClass: 'best', phase: 'opening', tags: [], ...partial,
  };
}

describe('aggregateProfile', () => {
  it('returns an all-zero profile for no moves', () => {
    const profile = aggregateProfile([]);
    expect(profile.totalMoves).toBe(0);
    expect(profile.averageCpLoss).toBe(0);
    expect(profile.tagFrequency.hangsPieces).toBe(0);
    expect(profile.classCounts.blunder).toBe(0);
    expect(profile.examples.hangsPieces).toEqual([]);
  });
  it('computes tag frequency as fraction of moves carrying the tag', () => {
    const moves = [
      move({ tags: ['hangsPieces'] }),
      move({ tags: ['hangsPieces', 'missesTactics'] }),
      move({ tags: [] }), move({ tags: [] }),
    ];
    const profile = aggregateProfile(moves);
    expect(profile.totalMoves).toBe(4);
    expect(profile.tagFrequency.hangsPieces).toBeCloseTo(0.5);
    expect(profile.tagFrequency.missesTactics).toBeCloseTo(0.25);
    expect(profile.tagFrequency.weakEndgame).toBe(0);
  });
  it('averages centipawn loss and counts move classes', () => {
    const moves = [
      move({ cpLoss: 0, moveClass: 'best' }),
      move({ cpLoss: 100, moveClass: 'inaccuracy' }),
      move({ cpLoss: 300, moveClass: 'blunder' }),
    ];
    const profile = aggregateProfile(moves);
    expect(profile.averageCpLoss).toBeCloseTo(400 / 3);
    expect(profile.classCounts.best).toBe(1);
    expect(profile.classCounts.inaccuracy).toBe(1);
    expect(profile.classCounts.blunder).toBe(1);
  });
  it('keeps at most three examples per tag', () => {
    const moves = Array.from({ length: 5 }, (_, i) =>
      move({ ply: i, san: `m${i}`, tags: ['hangsPieces'] }),
    );
    const profile = aggregateProfile(moves);
    expect(profile.examples.hangsPieces).toHaveLength(3);
    expect(profile.examples.hangsPieces[0]?.san).toBe('m0');
  });
});
