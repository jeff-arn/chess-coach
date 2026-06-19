import type Anthropic from '@anthropic-ai/sdk';
import { lessonPlanSchema, type Coach, type CoachInput, type LessonPlan } from './types';

const TOOL_NAME = 'emit_plan';

const PLAN_TOOL = {
  name: TOOL_NAME,
  description: 'Return the ordered lesson plan and milestone rationale.',
  input_schema: {
    type: 'object',
    properties: {
      modules: {
        type: 'array',
        items: {
          type: 'object',
          properties: { moduleId: { type: 'string' }, rationale: { type: 'string' } },
          required: ['moduleId', 'rationale'],
        },
      },
      milestoneRationale: { type: 'string' },
    },
    required: ['modules', 'milestoneRationale'],
  },
} as const;

function buildPrompt(input: CoachInput): string {
  const catalog = input.catalog
    .map((m) => `- ${m.id} (${m.title}) addresses: ${m.weaknessTags.join(', ')}`)
    .join('\n');
  const tags = Object.entries(input.profile.tagFrequency)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => `${k}=${v.toFixed(2)}`)
    .join(', ');
  return [
    'You are a chess coach for a beginner. Build a personalized lesson plan.',
    'RULES: choose ONLY module ids from the catalog. Reference ONLY the weaknesses given.',
    'Do not invent chess evaluations. Order modules most-impactful first.',
    `Current rating: ${input.currentRating ?? 'unknown'}; target: ${input.targetRating ?? 'unset'}.`,
    `Weakness frequencies: ${tags || 'none recorded'}.`,
    `Already completed: ${input.completedModuleIds.join(', ') || 'none'}.`,
    `Catalog:\n${catalog}`,
    `Call the ${TOOL_NAME} tool with your plan.`,
  ].join('\n');
}

export class ClaudeCoach implements Coach {
  constructor(
    private readonly client: Anthropic,
    private readonly model: string,
  ) {}

  async buildPlan(input: CoachInput): Promise<LessonPlan> {
    const validIds = new Set(input.catalog.map((m) => m.id));
    const messages: { role: 'user'; content: string }[] = [
      { role: 'user', content: buildPrompt(input) },
    ];
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        tools: [PLAN_TOOL as never],
        tool_choice: { type: 'tool', name: TOOL_NAME },
        messages,
      });
      const block = res.content.find((b) => b.type === 'tool_use');
      const parsed = lessonPlanSchema.safeParse(block && 'input' in block ? block.input : undefined);
      if (parsed.success) {
        const modules = parsed.data.modules.filter((m) => validIds.has(m.moduleId));
        if (modules.length > 0) return { ...parsed.data, modules };
        lastErr = new Error('coach selected no valid modules');
      } else {
        lastErr = parsed.error;
      }
      // Give the single retry a corrective nudge instead of re-sending the same prompt.
      messages.push({
        role: 'user',
        content: `Your previous response was invalid (${
          lastErr instanceof Error ? lastErr.message : 'schema mismatch'
        }). Call ${TOOL_NAME} again, choosing moduleId values ONLY from the catalog above and including at least one module.`,
      });
    }
    throw lastErr instanceof Error ? lastErr : new Error('claude coach failed');
  }
}
