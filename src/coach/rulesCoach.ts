import type { Coach, CoachInput, LessonPlan } from './types';
import type { WeaknessTag } from '@/domain/types';

export class RulesCoach implements Coach {
  async buildPlan(input: CoachInput): Promise<LessonPlan> {
    const { profile, catalog, completedModuleIds, currentRating, targetRating } = input;
    const completed = new Set(completedModuleIds);

    const scored = catalog
      .filter((m) => !completed.has(m.id))
      .map((m) => {
        const score = m.weaknessTags.reduce(
          (sum, t) => sum + (profile.tagFrequency[t as WeaknessTag] ?? 0),
          0,
        );
        return { m, score };
      })
      .sort((a, b) => b.score - a.score || a.m.orderHint - b.m.orderHint);

    const modules = scored.map(({ m, score }) => ({
      moduleId: m.id,
      rationale:
        score > 0
          ? `Targets ${m.weaknessTags.join(', ')}, which shows up often in your recent games.`
          : `A core fundamental on the path from beginner to stronger play.`,
    }));

    const milestoneRationale =
      currentRating !== null && targetRating !== null
        ? `Working these modules should move you from ${currentRating} toward ${targetRating}.`
        : `Set a target rating to track progress toward a concrete milestone.`;

    return {
      modules: modules.length > 0 ? modules : [{ moduleId: catalog[0]?.id ?? 'board-awareness', rationale: 'Start here.' }],
      milestoneRationale,
    };
  }
}
