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

    // When every module is completed (or the catalog is empty), we still must
    // return at least one module — recommend reviewing the most fundamental one
    // rather than mislabeling a finished module as a fresh start.
    const reviewFallback = [...catalog].sort((a, b) => a.orderHint - b.orderHint)[0];
    const finalModules =
      modules.length > 0
        ? modules
        : reviewFallback
          ? [
              {
                moduleId: reviewFallback.id,
                rationale: "You've worked through the curriculum — revisit this fundamental to keep it sharp.",
              },
            ]
          : [{ moduleId: 'board-awareness', rationale: 'Start here.' }];

    return { modules: finalModules, milestoneRationale };
  }
}
