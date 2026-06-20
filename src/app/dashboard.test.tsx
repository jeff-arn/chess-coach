import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardView } from './DashboardView';

describe('DashboardView', () => {
  it('shows top weaknesses and a milestone when data exists', () => {
    render(
      <DashboardView
        profile={{ totalMoves: 10, averageCpLoss: 120, classCounts: { best: 1, good: 1, inaccuracy: 1, mistake: 1, blunder: 1 }, examples: {} as never, tagFrequency: { hangsPieces: 0.6, missesTactics: 0.2, missesMates: 0, weakOpening: 0, weakEndgame: 0, ignoresThreats: 0 } }}
        targetRating={600}
        latestRating={450}
      />,
    );
    expect(screen.getByText(/hangsPieces/i)).toBeInTheDocument();
    expect(screen.getByText(/600/)).toBeInTheDocument();
  });

  it('renders the empty state when no profile exists', () => {
    render(<DashboardView profile={null} targetRating={600} latestRating={450} />);
    expect(screen.getByText(/no analyzed games yet/i)).toBeInTheDocument();
  });
});
