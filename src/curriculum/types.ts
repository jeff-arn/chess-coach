import { z } from 'zod';
import { ALL_WEAKNESS_TAGS } from '@/domain/types';

const weaknessTagSchema = z.enum(ALL_WEAKNESS_TAGS as [string, ...string[]]);

export const practiceSchema = z.object({
  fen: z.string(),
  solution: z.string(),
  hint: z.string(),
});

export const examplePositionSchema = z.object({
  fen: z.string(),
  caption: z.string(),
  moves: z.array(z.string()),
});

export const moduleSchema = z.object({
  id: z.string(),
  title: z.string(),
  orderHint: z.number().int(),
  difficulty: z.number().int().min(1).max(5),
  weaknessTags: z.array(weaknessTagSchema).min(1),
  content: z.string().min(1),
  examplePositions: z.array(examplePositionSchema),
  practice: z.array(practiceSchema),
  completionCriteria: z.object({ practiceToPass: z.number().int().min(0) }),
});

export type Module = z.infer<typeof moduleSchema>;
export type ModuleMeta = Pick<Module, 'id' | 'title' | 'weaknessTags' | 'orderHint' | 'difficulty'>;
