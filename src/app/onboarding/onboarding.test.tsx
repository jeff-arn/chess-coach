import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OnboardingPage from './page';

// Mock the apiClient module (the single external seam) so the test asserts the page's
// behavior without a real network/DB call; mock next/navigation since there is no Next
// router in the jsdom test environment.
vi.mock('@/lib/apiClient', () => ({ updateSettings: vi.fn(async () => ({ ok: true })) }));
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

describe('Onboarding', () => {
  it('saves username + target rating then navigates to the dashboard', async () => {
    const { updateSettings } = await import('@/lib/apiClient');
    render(<OnboardingPage />);
    await userEvent.type(screen.getByLabelText(/chess.com username/i), 'magnus');
    await userEvent.type(screen.getByLabelText(/target rating/i), '600');
    await userEvent.click(screen.getByRole('button', { name: /start coaching/i }));
    expect(updateSettings).toHaveBeenCalledWith({ chesscomUsername: 'magnus', targetRating: 600 });
    expect(mockPush).toHaveBeenCalledWith('/');
  });
});
