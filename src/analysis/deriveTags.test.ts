import { describe, it, expect } from 'vitest';
import { deriveTags } from './deriveTags';
import type { EngineLine } from '@/engine/types';

const FEN_FREE_QUEEN = 'rnb1kbnr/pppp1ppp/8/8/3q4/4P3/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
const FEN_AFTER_QUIET = 'rnb1kbnr/pppp1ppp/8/8/3q4/4P2N/PPPP1PPP/RNBQKB1R b KQkq - 1 1';
// Position after the best move exd4 is actually played: the queen is gone, nothing hangs.
const FEN_AFTER_EXD4 = 'rnb1kbnr/pppp1ppp/8/8/3P4/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const line: EngineLine = { bestMoveUci: 'e3d4', scoreCp: 900, mate: null };

describe('deriveTags', () => {
  it('flags missesTactics when a winning capture was available and not played', () => {
    const tags = deriveTags({ fenBefore: FEN_FREE_QUEEN, fenAfter: FEN_AFTER_QUIET, san: 'Nf3', ply: 3, cpLoss: 850, line, wasCapture: false });
    expect(tags).toContain('missesTactics');
  });
  it('returns no tags for a best move with zero loss', () => {
    const tags = deriveTags({ fenBefore: FEN_FREE_QUEEN, fenAfter: FEN_AFTER_EXD4, san: 'exd4', ply: 3, cpLoss: 0, line, wasCapture: true });
    expect(tags).toEqual([]);
  });
  it('flags hangsPieces from the position alone, independent of cpLoss', () => {
    // Even with small cpLoss, leaving a piece en prise after the move is a hang.
    const tags = deriveTags({ fenBefore: FEN_AFTER_EXD4, fenAfter: FEN_FREE_QUEEN, san: 'Qd4', ply: 5, cpLoss: 0, line, wasCapture: false });
    expect(tags).toContain('hangsPieces');
  });
});
