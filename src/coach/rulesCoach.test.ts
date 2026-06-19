import { describe, it, expect } from 'vitest';
import { RulesCoach } from './rulesCoach';
import type { CoachInput } from './types';
import type { WeaknessProfile } from '@/domain/types';

function profile(over: Partial<WeaknessProfile['tagFrequency']>): WeaknessProfile {
  return {
    totalMoves: 100,
    averageCpLoss: 120,
    classCounts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
    examples: {} as WeaknessProfile['examples'],
    tagFrequency: {
      hangsPieces: 0, missesTactics: 0, missesMates: 0, weakOpening: 0, weakEndgame: 0, ignoresThreats: 0,
      ...over,
    },
  };
}

const catalog = [
  { id: 'dont-hang-pieces', title: 'Stop hanging', weaknessTags: ['hangsPieces'], orderHint: 20, difficulty: 1 },
  { id: 'opening-principles', title: 'Openings', weaknessTags: ['weakOpening'], orderHint: 60, difficulty: 2 },
];

describe('RulesCoach', () => {
  it('ranks the module addressing the strongest weakness first', async () => {
    const input: CoachInput = {
      profile: profile({ hangsPieces: 0.6, weakOpening: 0.1 }),
      currentRating: 400, targetRating: 600, catalog, completedModuleIds: [],
    };
    const plan = await new RulesCoach().buildPlan(input);
    expect(plan.modules[0]?.moduleId).toBe('dont-hang-pieces');
  });

  it('excludes completed modules', async () => {
    const input: CoachInput = {
      profile: profile({ hangsPieces: 0.6 }),
      currentRating: 400, targetRating: 600, catalog, completedModuleIds: ['dont-hang-pieces'],
    };
    const plan = await new RulesCoach().buildPlan(input);
    expect(plan.modules.map((m) => m.moduleId)).not.toContain('dont-hang-pieces');
  });
});
