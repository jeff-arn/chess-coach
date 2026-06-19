import { describe, it, expect, vi } from 'vitest';
import { ClaudeCoach } from './claudeCoach';
import type { CoachInput } from './types';
import type { WeaknessProfile } from '@/domain/types';

const baseProfile = {
  totalMoves: 50, averageCpLoss: 100,
  classCounts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 },
  examples: {} as WeaknessProfile['examples'],
  tagFrequency: { hangsPieces: 0.5, missesTactics: 0, missesMates: 0, weakOpening: 0, weakEndgame: 0, ignoresThreats: 0 },
} as WeaknessProfile;

const input: CoachInput = {
  profile: baseProfile, currentRating: 400, targetRating: 600,
  catalog: [{ id: 'dont-hang-pieces', title: 'x', weaknessTags: ['hangsPieces'], orderHint: 20, difficulty: 1 }],
  completedModuleIds: [],
};

function clientReturning(toolInput: unknown): { messages: { create: ReturnType<typeof vi.fn> } } {
  return {
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: 'tool_use', name: 'emit_plan', input: toolInput }],
      })),
    },
  };
}

describe('ClaudeCoach', () => {
  it('returns the validated plan from the tool call', async () => {
    const client = clientReturning({
      modules: [{ moduleId: 'dont-hang-pieces', rationale: 'You hang pieces often.' }],
      milestoneRationale: '400 to 600.',
    });
    const coach = new ClaudeCoach(client as never, 'claude-test');
    const plan = await coach.buildPlan(input);
    expect(plan.modules[0]?.moduleId).toBe('dont-hang-pieces');
  });

  it('retries once then throws on invalid tool output', async () => {
    const client = clientReturning({ modules: [], milestoneRationale: '' }); // invalid (min 1)
    const coach = new ClaudeCoach(client as never, 'claude-test');
    await expect(coach.buildPlan(input)).rejects.toThrow();
    expect(client.messages.create).toHaveBeenCalledTimes(2);
  });

  it('treats schema-valid output with no catalog-valid module ids as a failure', async () => {
    const client = clientReturning({
      modules: [{ moduleId: 'hallucinated-id', rationale: 'not in catalog' }],
      milestoneRationale: 'x',
    });
    const coach = new ClaudeCoach(client as never, 'claude-test');
    await expect(coach.buildPlan(input)).rejects.toThrow();
    expect(client.messages.create).toHaveBeenCalledTimes(2);
  });
});
