import { z } from 'zod';
import type { WeaknessProfile } from '@/domain/types';
import type { ModuleMeta } from '@/curriculum/types';

export const plannedModuleSchema = z.object({
  moduleId: z.string(),
  rationale: z.string().min(1),
});

export const lessonPlanSchema = z.object({
  modules: z.array(plannedModuleSchema).min(1),
  milestoneRationale: z.string().min(1),
});

export type LessonPlan = z.infer<typeof lessonPlanSchema>;

export type CoachInput = {
  profile: WeaknessProfile;
  currentRating: number | null;
  targetRating: number | null;
  catalog: ModuleMeta[];
  completedModuleIds: string[];
};

export interface Coach {
  buildPlan(input: CoachInput): Promise<LessonPlan>;
}
