export const DEFAULT_COACH_MODEL = 'claude-opus-4-8';

export function coachModel(): string {
  return process.env['COACH_MODEL'] ?? DEFAULT_COACH_MODEL;
}
