import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewView } from './ReviewView';
import type { MoveAnalysis } from '@/domain/types';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const BEFORE_QH5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const AFTER_QH5 = 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 1 2';

const moves: MoveAnalysis[] = [
  { ply: 1, fenBefore: START, fenAfter: AFTER_E4, san: 'e4', bestSan: 'e4', cpLoss: 0, moveClass: 'best', phase: 'opening', tags: [] },
  { ply: 3, fenBefore: BEFORE_QH5, fenAfter: AFTER_QH5, san: 'Qh5', bestSan: 'Nf3', cpLoss: 150, moveClass: 'mistake', phase: 'opening', tags: ['weakOpening'] },
];

describe('ReviewView', () => {
  it('steps to the next move and shows its classification', async () => {
    render(<ReviewView moves={moves} />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/mistake/i)).toBeInTheDocument();
    expect(screen.getByText(/weakOpening/)).toBeInTheDocument();
  });

  it('shows the empty state when there is no analysis', () => {
    render(<ReviewView moves={[]} />);
    expect(screen.getByText(/no analysis/i)).toBeInTheDocument();
  });
});
