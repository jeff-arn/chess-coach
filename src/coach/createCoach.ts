import Anthropic from '@anthropic-ai/sdk';
import type { Coach, CoachInput, LessonPlan } from './types';
import { RulesCoach } from './rulesCoach';
import { ClaudeCoach } from './claudeCoach';
import { coachModel } from './model';

export type CoachResult = { plan: LessonPlan; usedFallback: boolean };

/** Tries the primary coach; on any error, uses the fallback. */
export class FallbackCoach implements Coach {
  constructor(
    private readonly primary: Coach,
    private readonly fallback: Coach,
  ) {}

  async buildPlan(input: CoachInput): Promise<LessonPlan> {
    return (await this.buildPlanDetailed(input)).plan;
  }

  async buildPlanDetailed(input: CoachInput): Promise<CoachResult> {
    try {
      return { plan: await this.primary.buildPlan(input), usedFallback: false };
    } catch {
      return { plan: await this.fallback.buildPlan(input), usedFallback: true };
    }
  }
}

/** Build the configured coach. 'claude' uses ClaudeCoach with a RulesCoach fallback. */
export function createCoach(brain: string): FallbackCoach {
  const rules = new RulesCoach();
  if (brain === 'rules' || !process.env.ANTHROPIC_API_KEY) {
    return new FallbackCoach(rules, rules);
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return new FallbackCoach(new ClaudeCoach(client, coachModel()), rules);
}
