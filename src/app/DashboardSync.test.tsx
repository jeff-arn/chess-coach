import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardSync } from './DashboardSync';

// Mock StockfishEngine (its constructor builds a Web Worker, absent in jsdom) and runSync
// (its real behavior is covered by runSync.test.ts) so this test isolates the island's wiring.
vi.mock('@/engine/stockfishEngine', () => ({ StockfishEngine: vi.fn(() => ({ evaluate: vi.fn(), dispose: vi.fn() })) }));
vi.mock('@/flows/runSync', () => ({ runSync: vi.fn(async () => ({ profile: { totalMoves: 0 } })) }));
vi.mock('@/lib/apiClient', () => ({ fetchArchive: vi.fn(async () => ({ games: [] })) }));

describe('DashboardSync', () => {
  it('prompts for a username when none is set', () => {
    render(<DashboardSync username={null} />);
    expect(screen.getByText(/add your chess.com username/i)).toBeInTheDocument();
  });

  it('runs the sync flow when the button is clicked', async () => {
    const { runSync } = await import('@/flows/runSync');
    // jsdom has no navigation; stub reload so the handler completes without throwing.
    const reload = vi.fn();
    Object.defineProperty(window, 'location', { value: { reload }, writable: true });
    render(<DashboardSync username="magnus" />);
    await userEvent.click(screen.getByRole('button', { name: /sync/i }));
    expect(runSync).toHaveBeenCalledOnce();
  });
});
