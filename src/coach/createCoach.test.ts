import { describe, it, expect, vi } from 'vitest';
import { FallbackCoach } from './createCoach';
import { RulesCoach } from './rulesCoach';
import type { Coach, CoachInput } from './types';
import type { WeaknessProfile } from '@/domain/types';

const input: CoachInput = {
  profile: { totalMoves: 1, averageCpLoss: 0, classCounts: { best: 1, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }, examples: {} as WeaknessProfile['examples'], tagFrequency: { hangsPieces: 1, missesTactics: 0, missesMates: 0, weakOpening: 0, weakEndgame: 0, ignoresThreats: 0 } },
  currentRating: 400, targetRating: 600,
  catalog: [{ id: 'dont-hang-pieces', title: 'x', weaknessTags: ['hangsPieces'], orderHint: 20, difficulty: 1 }],
  completedModuleIds: [],
};

describe('FallbackCoach', () => {
  it('falls back to the secondary coach when the primary throws', async () => {
    const failing: Coach = { buildPlan: vi.fn(async () => { throw new Error('claude down'); }) };
    const coach = new FallbackCoach(failing, new RulesCoach());
    const result = await coach.buildPlanDetailed(input);
    expect(result.usedFallback).toBe(true);
    expect(result.plan.modules[0]?.moduleId).toBe('dont-hang-pieces');
    expect(failing.buildPlan).toHaveBeenCalledOnce();
  });
});
