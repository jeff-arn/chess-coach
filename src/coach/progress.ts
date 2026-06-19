export type RatingSync = { rating: number; at: string };

export type Milestone = {
  startRating: number;
  targetRating: number;
  status: 'active' | 'reached' | 'abandoned';
  createdAt: string;
  ratingSyncs: RatingSync[];
};

export function createMilestone(
  startRating: number,
  targetRating: number,
  createdAt: string,
): Milestone {
  return { startRating, targetRating, status: 'active', createdAt, ratingSyncs: [] };
}

export function recordRatingSync(m: Milestone, rating: number, at: string): Milestone {
  const ratingSyncs = [...m.ratingSyncs, { rating, at }];
  const status = rating >= m.targetRating ? 'reached' : m.status;
  return { ...m, ratingSyncs, status };
}

export function milestoneProgress(m: Milestone): number {
  const latest = m.ratingSyncs.at(-1)?.rating ?? m.startRating;
  const gap = m.targetRating - m.startRating;
  if (gap <= 0) return latest >= m.targetRating ? 1 : 0;
  return Math.max(0, Math.min(1, (latest - m.startRating) / gap));
}
