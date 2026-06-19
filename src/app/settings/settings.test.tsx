import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from './page';

// Mock the apiClient seam so the test drives the page without a real /api/db round-trip.
vi.mock('@/lib/apiClient', () => ({
  getSettings: vi.fn(async () => ({ chesscomUsername: 'me', targetRating: 600, coachBrain: 'claude' })),
  updateSettings: vi.fn(async () => ({ ok: true })),
}));

describe('SettingsPage', () => {
  it('loads current settings and saves changes', async () => {
    const { updateSettings } = await import('@/lib/apiClient');
    render(<SettingsPage />);
    const target = await screen.findByLabelText(/target rating/i);
    await userEvent.clear(target);
    await userEvent.type(target, '800');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(updateSettings).toHaveBeenCalledWith(expect.objectContaining({ targetRating: 800 }));
  });
});
