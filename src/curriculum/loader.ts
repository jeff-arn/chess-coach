import { moduleSchema, type Module, type ModuleMeta } from './types';
import { MODULES } from './modules';

let validated: Module[] | null = null;

export function validateCurriculum(): Module[] {
  if (validated) return validated;
  validated = MODULES.map((m) => moduleSchema.parse(m));
  const ids = new Set<string>();
  for (const m of validated) {
    if (ids.has(m.id)) throw new Error(`duplicate module id: ${m.id}`);
    ids.add(m.id);
  }
  return validated;
}

export function getCatalog(): ModuleMeta[] {
  return validateCurriculum()
    .map(({ id, title, weaknessTags, orderHint, difficulty }) => ({
      id,
      title,
      weaknessTags,
      orderHint,
      difficulty,
    }))
    .sort((a, b) => a.orderHint - b.orderHint);
}

export function getModule(id: string): Module | undefined {
  return validateCurriculum().find((m) => m.id === id);
}
