# chess-coach — Plan 3: Coaching & Curriculum

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Tracking lives in beads** — see the Tracking section. The markdown is the implementation reference.

**Goal:** Turn a stored weakness profile into a personalized lesson plan and a rating milestone. Build the pluggable `Coach` interface, a deterministic rules-based coach, a Claude-backed coach (structured tool output), a fallback wrapper, the curated curriculum content + loader, the milestone/progress logic, and the `/api/coach` route.

**Architecture:** A `Coach` interface with two implementations behind a fallback wrapper: `ClaudeCoach` (default; wraps the Anthropic SDK and forces a schema-validated tool call) and `RulesCoach` (deterministic; matches module tags to the profile). The curriculum is pre-authored data validated with `zod` at load. The coach only selects modules from that catalog and only references facts in the supplied profile (see `.claude/rules/llm-coach.md`). Milestone math is pure and unit-tested.

**Tech Stack:** `@anthropic-ai/sdk`, `zod`, Vitest. Builds on Plan 1 (domain) and Plan 2 (persistence, profile).

**This is Plan 3 of 4.** Depends on Plan 2 (epic `chess-coach-analysis`). Plan 4 = UI & E2E.

**Spec:** `docs/superpowers/specs/2026-06-19-chess-coach-design.md`

## Tracking (beads)

Epic: **`chess-coach-coaching`** (depends on Plan 2 epic). Run `bd ready` for the next task.

| Task | Depends on |
|------|------------|
| Task 1: Anthropic SDK dependency | Plan 2 complete |
| Task 2: Coach + curriculum types/schemas | Task 1 |
| Task 3: Curriculum content + loader | Task 2 |
| Task 4: RulesCoach | Task 2, 3 |
| Task 5: ClaudeCoach | Task 2 |
| Task 6: Coach factory + fallback | Task 4, 5 |
| Task 7: Milestone + progress logic | Plan 2 |
| Task 8: /api/coach route | Task 6, 7 |

---

## File Structure (created by this plan)

```
src/
├── coach/
│   ├── types.ts                 # Coach interface, CoachInput, LessonPlan + zod
│   ├── rulesCoach.ts
│   ├── rulesCoach.test.ts
│   ├── claudeCoach.ts
│   ├── claudeCoach.test.ts
│   ├── createCoach.ts           # factory + fallback wrapper
│   ├── createCoach.test.ts
│   ├── model.ts                 # default Claude model id
│   ├── progress.ts              # milestone math
│   └── progress.test.ts
├── curriculum/
│   ├── types.ts                 # Module + zod schema, ModuleMeta
│   ├── modules.ts               # the authored module data
│   ├── loader.ts                # validate + expose catalog/get
│   └── loader.test.ts
└── app/api/coach/
    ├── route.ts
    └── route.test.ts
```

---

## Task 1: Anthropic SDK dependency

**Files:** Modify `package.json`.

- [ ] **Step 1: Install**

Run: `pnpm add @anthropic-ai/sdk@0.39.0`

- [ ] **Step 2: Verify and commit**

Run: `pnpm typecheck` (passes; no usage yet).
```bash
git add package.json pnpm-lock.yaml
git commit -m "build: add anthropic sdk for the claude coach"
```

---

## Task 2: Coach + curriculum types and schemas

**Files:** Create `src/curriculum/types.ts`, `src/coach/types.ts`, `src/coach/model.ts`.

- [ ] **Step 1: Create `src/curriculum/types.ts`**

```ts
import { z } from 'zod';
import { ALL_WEAKNESS_TAGS } from '@/domain/types';

const weaknessTagSchema = z.enum(ALL_WEAKNESS_TAGS as [string, ...string[]]);

export const practiceSchema = z.object({
  fen: z.string(),
  solution: z.string(), // SAN of the correct move
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
```

- [ ] **Step 2: Create `src/coach/model.ts`**

```ts
/**
 * Default Claude model for the coach. Confirm the current id against the Claude
 * API reference (claude-api skill) before changing. Overridable via COACH_MODEL.
 */
export const DEFAULT_COACH_MODEL = 'claude-opus-4-8';

export function coachModel(): string {
  return process.env.COACH_MODEL ?? DEFAULT_COACH_MODEL;
}
```

- [ ] **Step 3: Create `src/coach/types.ts`**

```ts
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
```

- [ ] **Step 4: Typecheck and commit**

Run: `pnpm typecheck`
Expected: passes.
```bash
git add src/curriculum/types.ts src/coach/types.ts src/coach/model.ts
git commit -m "feat(coach): add coach and curriculum types and schemas"
```

---

## Task 3: Curriculum content + loader

**Files:** Create `src/curriculum/modules.ts`, `src/curriculum/loader.ts`, `src/curriculum/loader.test.ts`.

- [ ] **Step 1: Write the failing test** (`loader.test.ts`)

```ts
import { describe, it, expect } from 'vitest';
import { getCatalog, getModule, validateCurriculum } from './loader';

describe('curriculum loader', () => {
  it('validates and exposes a catalog of at least 8 modules', () => {
    expect(() => validateCurriculum()).not.toThrow();
    expect(getCatalog().length).toBeGreaterThanOrEqual(8);
  });

  it('every module has at least one weakness tag and a stable id', () => {
    for (const m of getCatalog()) {
      expect(m.weaknessTags.length).toBeGreaterThan(0);
      expect(m.id).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('getModule returns full content for a known id', () => {
    const first = getCatalog()[0];
    expect(first).toBeDefined();
    expect(getModule(first!.id)?.content.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/curriculum/loader.test.ts`
Expected: FAIL.

- [ ] **Step 3: Author `src/curriculum/modules.ts`**

Export `const MODULES: Module[]`. Author **at least 8** beginner modules covering the
true-beginner path. Use these ids/titles/tags/order (author real `content` markdown,
2–4 `examplePositions`, and 3–5 `practice` puzzles per module, each with a valid FEN and
the SAN solution — see `.claude/rules/chess-domain.md` for vocabulary):

1. `board-awareness` — "See the whole board" — tags `['hangsPieces']`, order 10, difficulty 1
2. `dont-hang-pieces` — "Stop giving away pieces" — tags `['hangsPieces','ignoresThreats']`, order 20, difficulty 1
3. `spot-threats` — "What is my opponent threatening?" — tags `['ignoresThreats','hangsPieces']`, order 30, difficulty 2
4. `tactics-forks` — "Forks" — tags `['missesTactics']`, order 40, difficulty 2
5. `tactics-pins-skewers` — "Pins and skewers" — tags `['missesTactics']`, order 50, difficulty 2
6. `opening-principles` — "Open like a pro" — tags `['weakOpening']`, order 60, difficulty 2
7. `basic-checkmates` — "King + queen / king + rook mates" — tags `['missesMates','weakEndgame']`, order 70, difficulty 3
8. `king-and-pawn-endgames` — "King and pawn endgames" — tags `['weakEndgame']`, order 80, difficulty 3

Two fully-authored reference modules (write the remaining six in the same shape):

```ts
import type { Module } from './types';

export const MODULES: Module[] = [
  {
    id: 'board-awareness',
    title: 'See the whole board',
    orderHint: 10,
    difficulty: 1,
    weaknessTags: ['hangsPieces'],
    content:
      '# See the whole board\n\nBefore every move, scan all your pieces and ask: is any of them attacked? A piece is *attacked* when an enemy piece could capture it next move. Most beginner losses come from leaving a piece where it can simply be taken for free.\n\n**The one-second check:** after you decide on a move, pause and look — does it leave anything of yours able to be captured for nothing?',
    examplePositions: [
      {
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        caption: 'Quiet position — scan: no white piece is attacked.',
        moves: ['Nf3'],
      },
    ],
    practice: [
      {
        fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/8/PPPPPP1P/RNBQKBNR b KQkq - 0 2',
        solution: 'Qh4',
        hint: 'White just weakened the king. Is there a square the queen can punish from?',
      },
    ],
    completionCriteria: { practiceToPass: 1 },
  },
  {
    id: 'dont-hang-pieces',
    title: 'Stop giving away pieces',
    orderHint: 20,
    difficulty: 1,
    weaknessTags: ['hangsPieces', 'ignoresThreats'],
    content:
      '# Stop giving away pieces\n\nA *hanging* piece is one that can be captured for free — the opponent loses nothing to take it. Two habits fix this: (1) never move a piece to a square an enemy pawn or piece guards unless you have a reason; (2) when the opponent attacks a piece, defend it, move it, or counter-attack something bigger.',
    examplePositions: [
      {
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
        caption: 'The bishop on c4 eyes f7 — Black must stay alert to threats.',
        moves: ['Nf6'],
      },
    ],
    practice: [
      {
        fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 4 3',
        solution: 'Nf3',
        hint: 'Develop while keeping every piece defended.',
      },
    ],
    completionCriteria: { practiceToPass: 1 },
  },
  // ...author spot-threats, tactics-forks, tactics-pins-skewers, opening-principles,
  // basic-checkmates, king-and-pawn-endgames in this same shape.
];
```

- [ ] **Step 4: Implement `loader.ts`**

```ts
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
```

- [ ] **Step 5: Run to verify it passes, then commit**

Run: `pnpm vitest run src/curriculum/loader.test.ts`
Expected: PASS (3 tests). If it fails because fewer than 8 modules are authored, write
the remaining modules — do not weaken the test.
```bash
git add src/curriculum
git commit -m "feat(curriculum): add beginner modules and validating loader"
```

---

## Task 4: RulesCoach

**Files:** Create `src/coach/rulesCoach.ts`, `src/coach/rulesCoach.test.ts`.

Deterministic: score each not-completed module by the summed profile frequency of the
tags it addresses; order by score desc, then `orderHint` asc; emit a rationale naming
the top matched weakness. Always returns at least one module (falls back to the
lowest-`orderHint` module when the profile is empty).

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/coach/rulesCoach.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `rulesCoach.ts`**

```ts
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

    const picked = scored.length > 0 ? scored : [];
    const modules = picked.map(({ m, score }) => ({
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

    return { modules: modules.length > 0 ? modules : [{ moduleId: catalog[0]?.id ?? 'board-awareness', rationale: 'Start here.' }], milestoneRationale };
  }
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `pnpm vitest run src/coach/rulesCoach.test.ts`
Expected: PASS.
```bash
git add src/coach/rulesCoach.ts src/coach/rulesCoach.test.ts
git commit -m "feat(coach): add deterministic rules-based coach"
```

---

## Task 5: ClaudeCoach

**Files:** Create `src/coach/claudeCoach.ts`, `src/coach/claudeCoach.test.ts`.

Wraps the Anthropic SDK and forces a single tool call whose `input_schema` mirrors
`lessonPlanSchema`. Validates the tool input with `zod`; one retry; throws on repeated
failure (the fallback wrapper in Task 6 catches it). The SDK client is injected for
testability.

- [ ] **Step 1: Write the failing test** (inject a fake client)

```ts
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
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/coach/claudeCoach.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `claudeCoach.ts`**

```ts
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
    const prompt = buildPrompt(input);
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const res = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        tools: [PLAN_TOOL as never],
        tool_choice: { type: 'tool', name: TOOL_NAME },
        messages: [{ role: 'user', content: prompt }],
      });
      const block = res.content.find((b) => b.type === 'tool_use');
      const parsed = lessonPlanSchema.safeParse(block && 'input' in block ? block.input : undefined);
      if (parsed.success) {
        const validIds = new Set(input.catalog.map((m) => m.id));
        parsed.data.modules = parsed.data.modules.filter((m) => validIds.has(m.moduleId));
        if (parsed.data.modules.length > 0) return parsed.data;
        lastErr = new Error('coach selected no valid modules');
      } else {
        lastErr = parsed.error;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error('claude coach failed');
  }
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `pnpm vitest run src/coach/claudeCoach.test.ts`
Expected: PASS (2 tests).
```bash
git add src/coach/claudeCoach.ts src/coach/claudeCoach.test.ts
git commit -m "feat(coach): add claude coach with schema-validated tool output"
```

---

## Task 6: Coach factory + fallback

**Files:** Create `src/coach/createCoach.ts`, `src/coach/createCoach.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi } from 'vitest';
import { FallbackCoach } from './createCoach';
import { RulesCoach } from './rulesCoach';
import type { Coach, CoachInput } from './types';
import type { WeaknessProfile } from '@/domain/types';

const input: CoachInput = {
  profile: { totalMoves: 1, averageCpLoss: 0, classCounts: { best: 1, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }, examples: {} as WeaknessProfile['examples'], tagFrequency: { hangsPieces: 1, missesTactics: 0, missesMates: 0, weakOpening: 0, weakEndgame: 0, ignoresThreats: 0 } },
  currentRating: 400, targetRating: 600,
  catalog: [{ id: 'dont-hang-pieces', title: 'x', weaknessTags: ['hangsPieces'], orderHint: 20, difficulty: 1 }],
  completedModuleIds: [],
};

describe('FallbackCoach', () => {
  it('falls back to the secondary coach when the primary throws', async () => {
    const failing: Coach = { buildPlan: vi.fn(async () => { throw new Error('claude down'); }) };
    const coach = new FallbackCoach(failing, new RulesCoach());
    const plan = await coach.buildPlan(input);
    expect(plan.modules[0]?.moduleId).toBe('dont-hang-pieces');
    expect(failing.buildPlan).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/coach/createCoach.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `createCoach.ts`**

```ts
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
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `pnpm vitest run src/coach/createCoach.test.ts`
Expected: PASS.
```bash
git add src/coach/createCoach.ts src/coach/createCoach.test.ts
git commit -m "feat(coach): add coach factory with rules-based fallback"
```

---

## Task 7: Milestone + progress logic

**Files:** Create `src/coach/progress.ts`, `src/coach/progress.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createMilestone, recordRatingSync, milestoneProgress } from './progress';

describe('milestone progress', () => {
  it('starts active at zero progress', () => {
    const m = createMilestone(400, 600, '2026-01-01T00:00:00Z');
    expect(m.status).toBe('active');
    expect(milestoneProgress(m)).toBe(0);
  });

  it('progress is the fraction of the gap closed', () => {
    let m = createMilestone(400, 600, '2026-01-01T00:00:00Z');
    m = recordRatingSync(m, 500, '2026-02-01T00:00:00Z');
    expect(milestoneProgress(m)).toBeCloseTo(0.5);
    expect(m.status).toBe('active');
  });

  it('marks reached when the target is hit', () => {
    let m = createMilestone(400, 600, '2026-01-01T00:00:00Z');
    m = recordRatingSync(m, 610, '2026-03-01T00:00:00Z');
    expect(m.status).toBe('reached');
    expect(milestoneProgress(m)).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/coach/progress.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `progress.ts`**

```ts
export type RatingSync = { rating: number; at: string };

export type Milestone = {
  startRating: number;
  targetRating: number;
  status: 'active' | 'reached' | 'abandoned';
  createdAt: string;
  ratingSyncs: RatingSync[];
};

export function createMilestone(startRating: number, targetRating: number, createdAt: string): Milestone {
  return { startRating, targetRating, status: 'active', createdAt, ratingSyncs: [] };
}

export function recordRatingSync(m: Milestone, rating: number, at: string): Milestone {
  const ratingSyncs = [...m.ratingSyncs, { rating, at }];
  const status = rating >= m.targetRating ? 'reached' : m.status;
  return { ...m, ratingSyncs, status };
}

/** Fraction of the start->target gap closed, clamped to [0,1]. */
export function milestoneProgress(m: Milestone): number {
  const latest = m.ratingSyncs.at(-1)?.rating ?? m.startRating;
  const gap = m.targetRating - m.startRating;
  if (gap <= 0) return latest >= m.targetRating ? 1 : 0;
  return Math.max(0, Math.min(1, (latest - m.startRating) / gap));
}
```

- [ ] **Step 4: Run to verify it passes, then commit**

Run: `pnpm vitest run src/coach/progress.test.ts`
Expected: PASS (3 tests).
```bash
git add src/coach/progress.ts src/coach/progress.test.ts
git commit -m "feat(coach): add milestone and progress math"
```

---

## Task 8: `/api/coach` route

**Files:** Create `src/app/api/coach/route.ts`, `src/app/api/coach/route.test.ts`.

POST builds a plan from the latest stored profile + settings + curriculum catalog +
completed modules, using the configured coach (with fallback), persists it to the
`plans` table, and returns `{ plan, usedFallback }`.

- [ ] **Step 1: Write the failing test** (mock db + coach)

```ts
import { describe, it, expect, vi } from 'vitest';
import { openDb } from '@/db/connection';

const db = openDb(':memory:');
db.prepare("INSERT INTO weakness_profiles (created_at, profile_json) VALUES (?, ?)").run(
  '2026-01-01T00:00:00Z',
  JSON.stringify({ totalMoves: 10, averageCpLoss: 100, classCounts: { best: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 }, examples: {}, tagFrequency: { hangsPieces: 0.6, missesTactics: 0, missesMates: 0, weakOpening: 0, weakEndgame: 0, ignoresThreats: 0 } }),
);
db.prepare('UPDATE settings SET chesscom_username=?, target_rating=?, coach_brain=? WHERE id=1').run('me', 600, 'rules');

vi.mock('@/db/connection', async (orig) => ({ ...(await orig<typeof import('@/db/connection')>()), getDb: () => db }));

import { POST } from './route';

describe('POST /api/coach', () => {
  it('returns a plan built from the latest profile and curriculum', async () => {
    const res = await POST(new Request('http://localhost/api/coach', { method: 'POST' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan.modules.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm vitest run src/app/api/coach/route.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `route.ts`**

```ts
import { getDb } from '@/db/connection';
import { readSettings } from '@/db/repositories/settingsRepo';
import { latestProfile } from '@/db/repositories/profilesRepo';
import { getCatalog } from '@/curriculum/loader';
import { createCoach } from '@/coach/createCoach';

export async function POST(): Promise<Response> {
  const db = getDb();
  const profile = latestProfile(db);
  if (!profile) return Response.json({ error: 'no analyzed games yet' }, { status: 409 });

  const settings = readSettings(db);
  const completed = (
    db.prepare("SELECT module_id FROM module_progress WHERE status='completed'").all() as {
      module_id: string;
    }[]
  ).map((r) => r.module_id);

  const coach = createCoach(settings.coachBrain);
  const { plan, usedFallback } = await coach.buildPlanDetailed({
    profile,
    currentRating: null,
    targetRating: settings.targetRating,
    catalog: getCatalog(),
    completedModuleIds: completed,
  });

  db.prepare(
    `INSERT INTO plans (id, updated_at, plan_json) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at, plan_json=excluded.plan_json`,
  ).run(new Date().toISOString(), JSON.stringify(plan));

  return Response.json({ plan, usedFallback });
}
```

- [ ] **Step 4: Run the full suite, typecheck, lint, then commit**

Run: `pnpm test:run && pnpm typecheck && pnpm lint`
Expected: all pass.
```bash
git add src/app/api/coach
git commit -m "feat(api): add coach route that builds and stores the plan"
```

---

## Done criteria for Plan 3

- `pnpm test:run`, `pnpm typecheck`, `pnpm lint` all pass.
- The curriculum has ≥8 validated beginner modules with content, examples, and practice.
- `RulesCoach` and `ClaudeCoach` both implement `Coach`; `FallbackCoach` degrades to
  rules-based when Claude fails; `createCoach` wires them by settings + API-key presence.
- Milestone/progress math is correct and tested.
- `/api/coach` builds, persists, and returns a plan (with `usedFallback`).

**Next:** Plan 4 — UI & E2E (the seven screens, navigation, charts, Playwright journeys
including the engine smoke test and the coach-fallback banner).
