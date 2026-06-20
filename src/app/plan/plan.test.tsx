import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlanPage from './page';

// Mock the apiClient seam so the test drives the page's render/branch logic without a
// real /api/coach call.
vi.mock('@/lib/apiClient', () => ({
  buildPlan: vi.fn(async () => ({ plan: { modules: [{ moduleId: 'dont-hang-pieces', rationale: 'You hang pieces.' }], milestoneRationale: 'x' }, usedFallback: true })),
}));

describe('PlanPage', () => {
  it('builds and lists modules, showing the fallback banner', async () => {
    render(<PlanPage />);
    await userEvent.click(screen.getByRole('button', { name: /build my plan/i }));
    expect(await screen.findByText(/dont-hang-pieces/)).toBeInTheDocument();
    expect(screen.getByText(/offline coaching/i)).toBeInTheDocument();
  });
});
