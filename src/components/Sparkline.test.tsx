import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Sparkline } from './Sparkline';

describe('Sparkline', () => {
  it('renders a polyline with one point per value', () => {
    const { container } = render(<Sparkline values={[400, 450, 500]} />);
    const points = container.querySelector('polyline')?.getAttribute('points') ?? '';
    expect(points.trim().split(/\s+/)).toHaveLength(3);
  });

  it('renders an empty-state svg with no polyline when there are no values', () => {
    const { container, getByRole } = render(<Sparkline values={[]} />);
    expect(getByRole('img')).toHaveAttribute('aria-label', 'No data');
    expect(container.querySelector('polyline')).toBeNull();
  });
});
