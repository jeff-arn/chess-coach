import { describe, it, expect } from 'vitest';
import { createMilestone, recordRatingSync, milestoneProgress } from './progress';

describe('milestone progress', () => {
  it('starts active at zero progress', () => {
    const m = createMilestone(400, 600, '2026-01-01T00:00:00Z');
    expect(m.status).toBe('active');
    expect(milestoneProgress(m)).toBe(0);
  });
  it('progress is the fraction of the gap closed', () => {
    let m = createMilestone(400, 600, '2026-01-01T00:00:00Z');
    m = recordRatingSync(m, 500, '2026-02-01T00:00:00Z');
    expect(milestoneProgress(m)).toBeCloseTo(0.5);
    expect(m.status).toBe('active');
  });
  it('marks reached when the target is hit', () => {
    let m = createMilestone(400, 600, '2026-01-01T00:00:00Z');
    m = recordRatingSync(m, 610, '2026-03-01T00:00:00Z');
    expect(m.status).toBe('reached');
    expect(milestoneProgress(m)).toBe(1);
  });
});
