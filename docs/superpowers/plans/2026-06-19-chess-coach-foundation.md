# chess-coach — Plan 1: Foundation & Domain Core

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the chess-coach Next.js project with its tooling and repo conventions, and implement the fully-tested, engine-independent chess analysis core (move classification, game-phase detection, weakness taggers, and weakness-profile aggregation).

**Architecture:** A single Next.js (App Router) + TypeScript app. This plan delivers only the foundation: the project skeleton, the `CLAUDE.md` + `.claude/rules/` guardrails + git hooks, and a pure-function `src/domain/` library with no external dependencies beyond `chess.js`. Everything here is synchronous, deterministic, and unit-tested with Vitest. Engine integration, persistence, the coach, and UI come in later plans.

**Tech Stack:** Next.js 15, React 19, TypeScript 5 (strict), `chess.js`, `zod`, Vitest, ESLint, Prettier, pnpm, `gitleaks` + git hooks.

**This is Plan 1 of 4.** Plan 2 = Analysis Integrations (SQLite, chess.com client, Stockfish wrapper, engine-dependent taggers, pipeline, API routes). Plan 3 = Coaching & Curriculum. Plan 4 = UI & E2E.

**Spec:** `docs/superpowers/specs/2026-06-19-chess-coach-design.md`

---

## File Structure (created by this plan)

```
chess-coach/
├── CLAUDE.md                       # project overview + rules index + commands
├── .claude/rules/                  # 11 guardrail files (see Task 2)
├── .githooks/                      # pre-commit + commit-msg
├── .env.example                    # documents required env vars
├── .gitignore                      # (already exists; extended)
├── .gitleaks.toml                  # gitleaks config
├── .prettierrc.json
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── app/                        # Next.js App Router (placeholder page for now)
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── domain/                     # PURE analysis core (this plan's focus)
│       ├── types.ts                # shared domain types
│       ├── thresholds.ts           # centipawn-loss thresholds (canonical)
│       ├── pieceValues.ts          # piece material values
│       ├── classifyMove.ts         # cpLoss -> MoveClass
│       ├── classifyMove.test.ts
│       ├── detectPhase.ts          # fen -> GamePhase
│       ├── detectPhase.test.ts
│       ├── aggregateProfile.ts     # MoveAnalysis[] -> WeaknessProfile
│       ├── aggregateProfile.test.ts
│       └── taggers/
│           ├── hangingPiece.ts     # fen -> boolean
│           ├── hangingPiece.test.ts
│           ├── weakOpening.ts      # move context -> boolean
│           └── weakOpening.test.ts
```

`src/domain/` has one responsibility: turn per-move facts into a weakness profile, using only `chess.js` and plain data. No I/O, no engine, no React. This keeps it trivially testable and reusable by the pipeline (Plan 2) and the coach (Plan 3).

---

## Task 1: Scaffold the Next.js project and tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc.json`, `vitest.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`
- Modify: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "chess-coach",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "lint": "next lint",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "chess.js": "1.0.0-beta.8",
    "next": "15.1.6",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "zod": "3.24.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.6.3",
    "@testing-library/react": "16.2.0",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "22.10.7",
    "@types/react": "19.0.7",
    "@types/react-dom": "19.0.3",
    "@vitejs/plugin-react": "4.3.4",
    "eslint": "9.18.0",
    "eslint-config-next": "15.1.6",
    "jsdom": "26.0.0",
    "prettier": "3.4.2",
    "typescript": "5.7.3",
    "vitest": "3.0.4"
  },
  "packageManager": "pnpm@10.16.1"
}
```

- [ ] **Step 2: Create `tsconfig.json`** (strict, matching the chainsmith posture)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "moduleDetection": "force",
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "jsx": "preserve",
    "allowJs": false,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 4: Create `eslint.config.mjs`**

```js
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

export default [...compat.extends('next/core-web-vitals', 'next/typescript')];
```

Add `@eslint/eslintrc` to devDependencies if `pnpm lint` reports it missing.

- [ ] **Step 5: Create `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

- [ ] **Step 6: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.test.{ts,tsx}'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
```

- [ ] **Step 7: Create the minimal App Router shell**

`src/app/layout.tsx`:

```tsx
import type { ReactNode } from 'react';

export const metadata = { title: 'chess-coach' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
export default function HomePage() {
  return <main>chess-coach</main>;
}
```

- [ ] **Step 8: Extend `.gitignore`**

Ensure it contains (it already has most from the spec commit):

```
node_modules/
.superpowers/
.env
*.db
dist/
.next/
next-env.d.ts
coverage/
```

- [ ] **Step 9: Install and verify**

Run: `pnpm install`
Then: `pnpm typecheck`
Expected: completes with no errors.
Then: `pnpm test:run`
Expected: "No test files found" (exit 0) — no tests exist yet.

- [ ] **Step 10: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json next.config.ts eslint.config.mjs .prettierrc.json vitest.config.ts src/app .gitignore
git commit -m "chore: scaffold next.js + typescript project and tooling"
```

---

## Task 2: Repo conventions, guardrails, and git hooks

**Files:**
- Create: `CLAUDE.md`, `.claude/rules/{clean-code,nextjs-react,web-ui,testing,security,llm-coach,chess-domain,engine-analysis,external-apis,data-persistence,commits}.md`, `.githooks/pre-commit`, `.githooks/commit-msg`, `.gitleaks.toml`, `.env.example`

This task is documentation + hooks (no TDD). Content is concrete; where a file closely mirrors the chainsmith template, the step names the exact source and the exact changes to make.

- [ ] **Step 1: Create `CLAUDE.md`**

```markdown
# chess-coach

A personal, locally-run AI chess coach for a beginner. Connects to a chess.com
account, analyzes games with Stockfish, distills a weakness profile, and uses a
pluggable Coach (Claude by default) to sequence a curated beginner curriculum and
set rating milestones. Single user, no accounts, all data local.

Design spec: `docs/superpowers/specs/2026-06-19-chess-coach-design.md`.

## Stack

- Framework: Next.js 15 (App Router), TypeScript `strict` (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`), pnpm
- Chess rules / PGN: `chess.js`
- Engine: Stockfish WASM in a Web Worker (browser)
- Persistence: local SQLite via `better-sqlite3`
- Coach: pluggable `Coach` interface; Claude (latest model) default + rules-based fallback
- Validation: `zod`
- Testing: Vitest + React Testing Library (unit/component), Playwright (E2E)
- Lint/format: ESLint (`next/core-web-vitals`, `next/typescript`) + Prettier

## Project phase

**Current phase:** `pre-launch` <!-- single user; APIs and schema can break freely -->

## Hard requirements

- **Strict TypeScript.** No `any`, no non-null assertions outside generated code.
- **The Claude API key never reaches the client bundle.** It is read server-side in
  API routes only. See `.claude/rules/security.md`.
- **Stockfish facts ground the coach.** The LLM never invents evaluations or moves;
  it selects from the fixed curriculum. See `.claude/rules/llm-coach.md`.
- **Strict testing discipline.** Happy + negative + variant coverage. A failing test
  is investigated, not weakened. See `.claude/rules/testing.md`.
- **The weakness-tag taxonomy and centipawn thresholds are canonical** and live in
  `src/domain/` per `.claude/rules/chess-domain.md`. Do not redefine them elsewhere.

## Rules files

- `.claude/rules/clean-code.md`: function design, naming, comments, anti-over-engineering, TS specifics
- `.claude/rules/nextjs-react.md`: server vs client components, API routes, hooks, state ownership, file layout
- `.claude/rules/web-ui.md`: semantic HTML, accessibility, responsive layout, chessboard patterns, design tokens
- `.claude/rules/testing.md`: Vitest, RTL, Playwright, the mock seam, what "tested" means
- `.claude/rules/security.md`: server-only secrets, parameterized SQL, untrusted input, CSP, deps
- `.claude/rules/llm-coach.md`: structured output, grounding, fallback, untrusted prompt input
- `.claude/rules/chess-domain.md`: chess vocabulary, weakness-tag taxonomy, classification thresholds
- `.claude/rules/engine-analysis.md`: Stockfish worker discipline, reproducible evals, caching
- `.claude/rules/external-apis.md`: chess.com + Claude client conventions, the mock seam
- `.claude/rules/data-persistence.md`: SQLite migrations, query layer, parameterized queries
- `.claude/rules/commits.md`: Conventional Commits

## Git hooks

One-time setup per clone:

\`\`\`bash
git config core.hooksPath .githooks
\`\`\`

- `pre-commit`: `gitleaks` secret scan, then `pnpm typecheck`, `pnpm lint`, `pnpm test:run`.
- `commit-msg`: validates the subject against Conventional Commits.

`gitleaks` must be on PATH; the pre-commit hook hard-fails if it is missing.

## Common commands

\`\`\`bash
pnpm dev          # dev server
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest watch
pnpm test:run     # vitest single run (CI / pre-commit)
\`\`\`

## Definition of done

- `pnpm typecheck` passes
- `pnpm lint` passes
- `pnpm test:run` passes, including negative and variant cases for changed code
- New behavior has tests at the correct layer (see `testing.md`)
- No secrets added to the client bundle or the repo
```

- [ ] **Step 2: Create `.claude/rules/clean-code.md`**

Copy `/home/jeffa/code/chainsmith-deck-builder/chainsmith-web/.claude/rules/clean-code.md` and make exactly these edits:
- Replace the opening line's project reference with: "Project-specific clean-code preferences for TypeScript and React in chess-coach."
- Remove the sentence referencing the backend's `chainsmith/.claude/rules/clean-code.md` spine.
- In "Use domain language", replace the FaB examples (hero/pitch/talent) with chess examples: "When chess says *blunder*, *centipawn*, *fork*, the code says blunder, centipawnLoss, fork. See `chess-domain.md` for the canonical vocabulary."
- In "Naming" examples, replace `validateDeck`/`legalDecks`/`Card` with chess analogues: `classifyMove`, `hangingMoves`, `MoveAnalysis`.
- Remove the FaB-specific bullet under "Don't anticipate features" and the i18n card-text reference.
- Keep the "TypeScript specifics", "Avoiding over-engineering", "Lint suppressions", and "When to break a rule" sections as-is (drop any i18n/Tailwind-rule names that don't exist here; keep the general ESLint/`@typescript-eslint` guidance).

- [ ] **Step 3: Create `.claude/rules/testing.md`**

Copy `/home/jeffa/code/chainsmith-deck-builder/chainsmith-web/.claude/rules/testing.md` and make exactly these edits:
- Remove all i18n sections ("i18n in tests") and i18n references in other sections.
- Remove `@axe-core/playwright` / accessibility-scan requirements from the E2E layer (web-ui.md owns accessibility; keep a single line: "Page-level E2E tests should keep keyboard reachability working").
- Replace the "deck-editor reducer / store" paragraph with: "The analysis core (`src/domain/`): `classifyMove`, the taggers, and `aggregateProfile` get canonical happy / boundary / negative coverage against known FENs and PGNs."
- Replace the E2E flow list with chess-coach's five journeys: onboarding→first sync, game review, module flow, re-sync→milestone, coach fallback (these are implemented in Plan 4).
- Replace "MSW" with: "External services (chess.com, Claude) are wrapped in clients mocked via a single seam; in E2E, network is intercepted with Playwright `route` serving fixtures. See `external-apis.md`."
- Keep "What tested means", "When a test fails", "What not to test", "Test naming", "Test data", "Coverage" largely intact.

- [ ] **Step 4: Create `.claude/rules/security.md`**

Copy `/home/jeffa/code/chainsmith-deck-builder/chainsmith-web/.claude/rules/security.md` as a starting structure, then replace its body with chess-coach specifics:
- **Secrets:** The Claude API key is read **server-side only** in API routes from `process.env.ANTHROPIC_API_KEY`. It is never referenced in a client component, never prefixed `NEXT_PUBLIC_`, and never logged. `.env` is gitignored; `.env.example` documents the variables with placeholders. `gitleaks` runs in pre-commit and CI.
- **SQL injection:** All SQLite access uses parameterized statements (`db.prepare(...).run(params)`); never string-concatenate user input into SQL. See `data-persistence.md`.
- **Untrusted input:** A chess.com username is validated (`^[A-Za-z0-9_-]{1,32}$`) before use. PGNs and chess.com responses are parsed defensively and validated with `zod` at the boundary.
- **LLM input:** Game data sent to Claude is untrusted; see `llm-coach.md`.
- **XSS:** Lesson content is authored markdown rendered through a sanitizing renderer; never inject raw HTML from untrusted strings (no React raw-HTML escape hatch on untrusted content).
- **Dependencies:** committed lockfile, pinned exact versions (no `^`), `pnpm audit` in CI.
- Keep a "when to break a rule" closing clause.

- [ ] **Step 5: Create `.claude/rules/commits.md` and the hooks**

`.claude/rules/commits.md`: Conventional Commits 1.0 — allowed types `feat|fix|perf|refactor|docs|style|test|build|ci|chore|revert`; optional lowercase scope `[a-z0-9_/-]`; subject starts lowercase/digit, no trailing period, ≤72 chars; `!` or `BREAKING CHANGE:` footer for breaks. Give 3 examples using chess-coach scopes (`domain`, `engine`, `coach`, `api`, `ui`).

`.githooks/commit-msg`: copy `/home/jeffa/code/chainsmith-deck-builder/chainsmith-web/.githooks/commit-msg` verbatim (it is project-agnostic) and update the example scopes in the help text to chess-coach ones.

`.githooks/pre-commit`: copy `/home/jeffa/code/chainsmith-deck-builder/chainsmith-web/.githooks/pre-commit` and make exactly these edits: remove the entire i18n-extraction freshness block (lines from "checking i18n extraction freshness" to its `fi`); change `pnpm test --run` to `pnpm test:run`; keep the gitleaks gate, `pnpm typecheck`, `pnpm lint`.

`.gitleaks.toml`: copy `/home/jeffa/code/chainsmith-deck-builder/chainsmith-web/.gitleaks.toml` verbatim.

- [ ] **Step 6: Create the remaining rules files as concrete files (not placeholders)**

These domains do not have code yet (they arrive in Plans 2–4). Create each file now with its **scope statement, the concrete rules already decided in the spec, and a "when to break a rule" clause**. Specifically:

- `nextjs-react.md`: server components by default; `'use client'` only for interactive/stateful components (board, forms); API routes under `src/app/api/<name>/route.ts`; data-access and engine code never imported into client components; rules of hooks; colocate component + test + styles by feature.
- `web-ui.md`: semantic HTML; every interactive element keyboard-reachable and focus-visible; color contrast AA; responsive single-column-friendly layout; chessboard interactions keyboard-operable where feasible; visual values come from design tokens, no magic inline styles.
- `llm-coach.md`: the coach returns schema-validated structured output (tool use / `zod` parse) with one retry then rules-based fallback; it only selects modules from the provided curriculum and only references facts present in the supplied weakness profile; fetched game data is untrusted prompt input; default to the latest Claude model id from the Claude API reference.
- `chess-domain.md`: the canonical vocabulary (FEN, PGN, ply, SAN, centipawn, cpLoss), the `WeaknessTag` taxonomy, the `MoveClass` set, and the `CP_LOSS_THRESHOLDS` — all stating the source of truth is `src/domain/types.ts` and `src/domain/thresholds.ts` (Task 3) and must not be duplicated.
- `engine-analysis.md`: Stockfish runs in a Web Worker; fixed search depth for reproducible evals; the UI never blocks on analysis (incremental progress); per-game analysis is cached and not recomputed; one game's engine failure skips that game, not the batch.
- `external-apis.md`: chess.com client sends a descriptive `User-Agent`, respects rate limits with backoff, validates responses with `zod`; the Claude client wraps the Anthropic SDK; both sit behind interfaces with a single mock seam for tests; timeouts on every network call.
- `data-persistence.md`: `better-sqlite3`; numbered migrations applied on startup; all queries parameterized; repository modules per table; fixture factories return fresh objects.

- [ ] **Step 7: Create `.env.example`**

```
# Claude API key for the default coach (server-side only, never NEXT_PUBLIC_)
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

# Optional: override the default Claude model id
# COACH_MODEL=claude-opus-4-8

# Path to the local SQLite database file
CHESS_COACH_DB=./chess-coach.db
```

- [ ] **Step 8: Wire up and verify hooks**

Run: `git config core.hooksPath .githooks && chmod +x .githooks/pre-commit .githooks/commit-msg`
Run: `bash .githooks/commit-msg <(printf 'bad subject line')`
Expected: exits non-zero with the Conventional Commits help text.
Run: `bash .githooks/commit-msg <(printf 'docs: add rules files')`
Expected: exits 0.

- [ ] **Step 9: Commit**

```bash
git add CLAUDE.md .claude .githooks .gitleaks.toml .env.example
git commit -m "docs: add repo conventions, rules files, and git hooks"
```

If `gitleaks` is not installed, install it first (`https://github.com/gitleaks/gitleaks#installing`) — the pre-commit hook requires it.

---

## Task 3: Domain types, thresholds, and piece values

**Files:**
- Create: `src/domain/types.ts`, `src/domain/thresholds.ts`, `src/domain/pieceValues.ts`

No tests (pure type/constant declarations). These are consumed and exercised by Tasks 4–8.

- [ ] **Step 1: Create `src/domain/types.ts`**

```ts
export type PieceColor = 'white' | 'black';

export type MoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

/**
 * The canonical weakness taxonomy. Source of truth for the whole app — the
 * analysis pipeline, curriculum module tags, and the coach all reference these.
 * Do not add synonyms elsewhere; extend this union.
 */
export type WeaknessTag =
  | 'hangsPieces'
  | 'missesTactics'
  | 'missesMates'
  | 'weakOpening'
  | 'weakEndgame'
  | 'ignoresThreats';

export const ALL_WEAKNESS_TAGS: readonly WeaknessTag[] = [
  'hangsPieces',
  'missesTactics',
  'missesMates',
  'weakOpening',
  'weakEndgame',
  'ignoresThreats',
];

export const ALL_MOVE_CLASSES: readonly MoveClass[] = [
  'best',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
];

/** One analyzed half-move played by the user. */
export type MoveAnalysis = {
  ply: number;
  fenBefore: string;
  fenAfter: string;
  san: string;
  bestSan: string;
  cpLoss: number;
  moveClass: MoveClass;
  phase: GamePhase;
  tags: WeaknessTag[];
};

export type ProfileExample = {
  fenBefore: string;
  san: string;
  bestSan: string;
};

export type WeaknessProfile = {
  totalMoves: number;
  tagFrequency: Record<WeaknessTag, number>;
  averageCpLoss: number;
  classCounts: Record<MoveClass, number>;
  examples: Record<WeaknessTag, ProfileExample[]>;
};
```

- [ ] **Step 2: Create `src/domain/thresholds.ts`**

```ts
/**
 * Centipawn-loss thresholds for move classification. Canonical — see
 * .claude/rules/chess-domain.md. cpLoss is how many centipawns worse the played
 * move is than the engine's best move (>= 0).
 *
 * best:       cpLoss <= 10
 * good:       cpLoss <= 50
 * inaccuracy: cpLoss <= 100
 * mistake:    cpLoss <= 200
 * blunder:    cpLoss  > 200
 */
export const CP_LOSS_THRESHOLDS = {
  best: 10,
  good: 50,
  inaccuracy: 100,
  mistake: 200,
} as const;
```

- [ ] **Step 3: Create `src/domain/pieceValues.ts`**

```ts
/** Standard material values in pawns, keyed by chess.js piece letters. */
export const PIECE_VALUE: Record<'p' | 'n' | 'b' | 'r' | 'q' | 'k', number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
};
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 5: Commit**

```bash
git add src/domain/types.ts src/domain/thresholds.ts src/domain/pieceValues.ts
git commit -m "feat(domain): add core types, thresholds, and piece values"
```

---

## Task 4: `classifyMove`

**Files:**
- Create: `src/domain/classifyMove.ts`
- Test: `src/domain/classifyMove.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { classifyMove } from './classifyMove';

describe('classifyMove', () => {
  it('returns best for zero or tiny centipawn loss', () => {
    expect(classifyMove(0)).toBe('best');
    expect(classifyMove(10)).toBe('best');
  });

  it('returns good just above the best threshold and at the good boundary', () => {
    expect(classifyMove(11)).toBe('good');
    expect(classifyMove(50)).toBe('good');
  });

  it('returns inaccuracy, mistake, and blunder across their ranges', () => {
    expect(classifyMove(51)).toBe('inaccuracy');
    expect(classifyMove(100)).toBe('inaccuracy');
    expect(classifyMove(101)).toBe('mistake');
    expect(classifyMove(200)).toBe('mistake');
    expect(classifyMove(201)).toBe('blunder');
    expect(classifyMove(5000)).toBe('blunder');
  });

  it('clamps negative losses (engine noise) to best', () => {
    expect(classifyMove(-30)).toBe('best');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/domain/classifyMove.test.ts`
Expected: FAIL — cannot import `classifyMove`.

- [ ] **Step 3: Write the implementation**

```ts
import { CP_LOSS_THRESHOLDS } from './thresholds';
import type { MoveClass } from './types';

/** Classify a played move by how many centipawns it lost versus the best move. */
export function classifyMove(cpLoss: number): MoveClass {
  const loss = Math.max(0, cpLoss);
  if (loss <= CP_LOSS_THRESHOLDS.best) return 'best';
  if (loss <= CP_LOSS_THRESHOLDS.good) return 'good';
  if (loss <= CP_LOSS_THRESHOLDS.inaccuracy) return 'inaccuracy';
  if (loss <= CP_LOSS_THRESHOLDS.mistake) return 'mistake';
  return 'blunder';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/domain/classifyMove.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/classifyMove.ts src/domain/classifyMove.test.ts
git commit -m "feat(domain): classify moves by centipawn loss"
```

---

## Task 5: `detectPhase`

**Files:**
- Create: `src/domain/detectPhase.ts`
- Test: `src/domain/detectPhase.test.ts`

Heuristic: fullmove ≤ 10 → opening; else if few non-pawn, non-king pieces remain (≤ 6) → endgame; else middlegame.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { detectPhase } from './detectPhase';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// Move 20, many pieces still on -> middlegame.
const MIDDLEGAME = 'r2q1rk1/pp2bppp/2n1bn2/2pp4/3P4/2N1PN2/PPQ1BPPP/R1B2RK1 w - - 4 20';
// King and pawn endgame, move 40 -> endgame.
const ENDGAME = '8/5pk1/6p1/8/8/6P1/5PK1/8 w - - 0 40';

describe('detectPhase', () => {
  it('treats the first ten full moves as the opening', () => {
    expect(detectPhase(START)).toBe('opening');
  });

  it('detects a middlegame when many pieces remain past move ten', () => {
    expect(detectPhase(MIDDLEGAME)).toBe('middlegame');
  });

  it('detects an endgame when few non-pawn pieces remain', () => {
    expect(detectPhase(ENDGAME)).toBe('endgame');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/domain/detectPhase.test.ts`
Expected: FAIL — cannot import `detectPhase`.

- [ ] **Step 3: Write the implementation**

```ts
import { Chess } from 'chess.js';
import type { GamePhase } from './types';

const NON_PAWN_NON_KING = new Set(['n', 'b', 'r', 'q']);

/** Classify the game phase from a FEN, using move number and remaining material. */
export function detectPhase(fen: string): GamePhase {
  const fullmove = Number(fen.split(' ')[5] ?? '1');
  if (Number.isFinite(fullmove) && fullmove <= 10) return 'opening';

  const board = new Chess(fen);
  const pieces = board.board().flat().filter((sq) => sq !== null);
  const heavyCount = pieces.filter((p) => NON_PAWN_NON_KING.has(p.type)).length;

  return heavyCount <= 6 ? 'endgame' : 'middlegame';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/domain/detectPhase.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/detectPhase.ts src/domain/detectPhase.test.ts
git commit -m "feat(domain): detect game phase from a position"
```

---

## Task 6: `detectHangingPiece` tagger

**Files:**
- Create: `src/domain/taggers/hangingPiece.ts`
- Test: `src/domain/taggers/hangingPiece.test.ts`

Heuristic (engine-free): in the position **after** the user's move, the side to move (the opponent) can win material by a capture — either capturing a clearly higher-value piece, or capturing a minor-or-better piece with no recapture available on that square.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { detectHangingPiece } from './hangingPiece';

// Start position: nothing hanging.
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Black queen on d4 is attacked by the white pawn on e3 and undefended.
// White to move can play exd4 winning the queen.
const QUEEN_ENPRISE = 'rnb1kbnr/pppp1ppp/8/8/3q4/4P3/PPPP1PPP/RNBQKBNR w KQkq - 0 1';

// Developed, quiet position: bishops out, knights out, nothing wins material.
const NOTHING_HANGS = 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

describe('detectHangingPiece', () => {
  it('returns false for the starting position', () => {
    expect(detectHangingPiece(START)).toBe(false);
  });

  it('returns true when an undefended high-value piece can be captured', () => {
    expect(detectHangingPiece(QUEEN_ENPRISE)).toBe(true);
  });

  it('returns false in a developed position with no free captures', () => {
    expect(detectHangingPiece(NOTHING_HANGS)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/domain/taggers/hangingPiece.test.ts`
Expected: FAIL — cannot import `detectHangingPiece`.

- [ ] **Step 3: Write the implementation**

```ts
import { Chess } from 'chess.js';
import { PIECE_VALUE } from '../pieceValues';

/**
 * True if the side to move in `fen` can win material with a capture — i.e. the
 * side that just moved left a piece hanging. Engine-free heuristic:
 *  - capturing a clearly higher-value piece is always a win, or
 *  - capturing a minor-or-better piece with no recapture on that square is free.
 */
export function detectHangingPiece(fen: string): boolean {
  const board = new Chess(fen);
  const captures = board.moves({ verbose: true }).filter((m) => m.captured);

  for (const cap of captures) {
    const capturedValue = PIECE_VALUE[cap.captured as keyof typeof PIECE_VALUE];
    const attackerValue = PIECE_VALUE[cap.piece as keyof typeof PIECE_VALUE];

    if (capturedValue > attackerValue) return true;

    const probe = new Chess(fen);
    probe.move({ from: cap.from, to: cap.to, promotion: 'q' });
    const hasRecapture = probe
      .moves({ verbose: true })
      .some((m) => m.to === cap.to && m.captured);

    if (!hasRecapture && capturedValue >= PIECE_VALUE.n) return true;
  }

  return false;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/domain/taggers/hangingPiece.test.ts`
Expected: PASS (3 tests). If `NOTHING_HANGS` trips the heuristic, the test fails — investigate the position, not the assertion; adjust the fixture FEN to a genuinely quiet developed position and document why in a comment.

- [ ] **Step 5: Commit**

```bash
git add src/domain/taggers/hangingPiece.ts src/domain/taggers/hangingPiece.test.ts
git commit -m "feat(domain): detect hanging pieces in a position"
```

---

## Task 7: `detectWeakOpening` tagger

**Files:**
- Create: `src/domain/taggers/weakOpening.ts`
- Test: `src/domain/taggers/weakOpening.test.ts`

Heuristic: only applies in the opening (ply ≤ 20). Flags a premature queen sortie (moving the queen off its home square at or before ply 6). Takes the position before the move, the played move in SAN, and the half-move number.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { detectWeakOpening } from './weakOpening';

describe('detectWeakOpening', () => {
  it('flags an early queen sortie in the opening', () => {
    // After 1. e4 e5, white plays Qh5 — premature queen development (ply 3).
    const fenBefore = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(detectWeakOpening(fenBefore, 'Qh5', 3)).toBe(true);
  });

  it('does not flag a normal developing move', () => {
    const fenBefore = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(detectWeakOpening(fenBefore, 'Nf3', 3)).toBe(false);
  });

  it('never flags once past the opening window', () => {
    const fenBefore = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(detectWeakOpening(fenBefore, 'Qh5', 21)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/domain/taggers/weakOpening.test.ts`
Expected: FAIL — cannot import `detectWeakOpening`.

- [ ] **Step 3: Write the implementation**

```ts
import { Chess } from 'chess.js';

const OPENING_PLY_LIMIT = 20;
const EARLY_QUEEN_PLY_LIMIT = 6;

/**
 * Engine-free opening-principle check. `fenBefore` is the position before the
 * user's move, `san` the move played, `ply` the half-move number (1-based).
 * Flags a premature queen sortie during the early opening.
 */
export function detectWeakOpening(fenBefore: string, san: string, ply: number): boolean {
  if (ply > OPENING_PLY_LIMIT) return false;

  const board = new Chess(fenBefore);
  // chess.js 1.0.0 throws on an illegal SAN rather than returning null.
  let move;
  try {
    move = board.move(san);
  } catch {
    return false;
  }

  return (
    move.piece === 'q' &&
    ply <= EARLY_QUEEN_PLY_LIMIT &&
    isQueenHomeSquare(move.from, move.color)
  );
}

function isQueenHomeSquare(square: string, color: 'w' | 'b'): boolean {
  return color === 'w' ? square === 'd1' : square === 'd8';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/domain/taggers/weakOpening.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/taggers/weakOpening.ts src/domain/taggers/weakOpening.test.ts
git commit -m "feat(domain): detect early-opening principle violations"
```

---

## Task 8: `aggregateProfile`

**Files:**
- Create: `src/domain/aggregateProfile.ts`
- Test: `src/domain/aggregateProfile.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { aggregateProfile } from './aggregateProfile';
import type { MoveAnalysis } from './types';

function move(partial: Partial<MoveAnalysis>): MoveAnalysis {
  return {
    ply: 1,
    fenBefore: 'startpos',
    fenAfter: 'startpos',
    san: 'e4',
    bestSan: 'e4',
    cpLoss: 0,
    moveClass: 'best',
    phase: 'opening',
    tags: [],
    ...partial,
  };
}

describe('aggregateProfile', () => {
  it('returns an all-zero profile for no moves', () => {
    const profile = aggregateProfile([]);
    expect(profile.totalMoves).toBe(0);
    expect(profile.averageCpLoss).toBe(0);
    expect(profile.tagFrequency.hangsPieces).toBe(0);
    expect(profile.classCounts.blunder).toBe(0);
    expect(profile.examples.hangsPieces).toEqual([]);
  });

  it('computes tag frequency as fraction of moves carrying the tag', () => {
    const moves = [
      move({ tags: ['hangsPieces'] }),
      move({ tags: ['hangsPieces', 'missesTactics'] }),
      move({ tags: [] }),
      move({ tags: [] }),
    ];
    const profile = aggregateProfile(moves);
    expect(profile.totalMoves).toBe(4);
    expect(profile.tagFrequency.hangsPieces).toBeCloseTo(0.5);
    expect(profile.tagFrequency.missesTactics).toBeCloseTo(0.25);
    expect(profile.tagFrequency.weakEndgame).toBe(0);
  });

  it('averages centipawn loss and counts move classes', () => {
    const moves = [
      move({ cpLoss: 0, moveClass: 'best' }),
      move({ cpLoss: 100, moveClass: 'inaccuracy' }),
      move({ cpLoss: 300, moveClass: 'blunder' }),
    ];
    const profile = aggregateProfile(moves);
    expect(profile.averageCpLoss).toBeCloseTo(400 / 3);
    expect(profile.classCounts.best).toBe(1);
    expect(profile.classCounts.inaccuracy).toBe(1);
    expect(profile.classCounts.blunder).toBe(1);
  });

  it('keeps at most three examples per tag', () => {
    const moves = Array.from({ length: 5 }, (_, i) =>
      move({ ply: i, san: `m${i}`, tags: ['hangsPieces'] }),
    );
    const profile = aggregateProfile(moves);
    expect(profile.examples.hangsPieces).toHaveLength(3);
    expect(profile.examples.hangsPieces[0]?.san).toBe('m0');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/domain/aggregateProfile.test.ts`
Expected: FAIL — cannot import `aggregateProfile`.

- [ ] **Step 3: Write the implementation**

```ts
import {
  ALL_MOVE_CLASSES,
  ALL_WEAKNESS_TAGS,
  type MoveAnalysis,
  type ProfileExample,
  type WeaknessProfile,
  type WeaknessTag,
} from './types';

const MAX_EXAMPLES_PER_TAG = 3;

/** Aggregate per-move analyses into a weakness profile. */
export function aggregateProfile(moves: MoveAnalysis[]): WeaknessProfile {
  const total = moves.length;

  const tagCounts = zeroBy(ALL_WEAKNESS_TAGS);
  const classCounts = zeroBy(ALL_MOVE_CLASSES);
  const examples = emptyExamples();
  let cpSum = 0;

  for (const m of moves) {
    cpSum += Math.max(0, m.cpLoss);
    classCounts[m.moveClass] += 1;
    for (const tag of m.tags) {
      tagCounts[tag] += 1;
      if (examples[tag].length < MAX_EXAMPLES_PER_TAG) {
        examples[tag].push({ fenBefore: m.fenBefore, san: m.san, bestSan: m.bestSan });
      }
    }
  }

  const tagFrequency = zeroBy(ALL_WEAKNESS_TAGS);
  for (const tag of ALL_WEAKNESS_TAGS) {
    tagFrequency[tag] = total === 0 ? 0 : tagCounts[tag] / total;
  }

  return {
    totalMoves: total,
    tagFrequency,
    averageCpLoss: total === 0 ? 0 : cpSum / total,
    classCounts,
    examples,
  };
}

function zeroBy<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

function emptyExamples(): Record<WeaknessTag, ProfileExample[]> {
  return Object.fromEntries(ALL_WEAKNESS_TAGS.map((t) => [t, [] as ProfileExample[]])) as Record<
    WeaknessTag,
    ProfileExample[]
  >;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/domain/aggregateProfile.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Run the full suite, typecheck, and lint**

Run: `pnpm test:run && pnpm typecheck && pnpm lint`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/domain/aggregateProfile.ts src/domain/aggregateProfile.test.ts
git commit -m "feat(domain): aggregate move analyses into a weakness profile"
```

---

## Done criteria for Plan 1

- `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test:run` all pass.
- `src/domain/` exposes `classifyMove`, `detectPhase`, `detectHangingPiece`,
  `detectWeakOpening`, and `aggregateProfile`, each with happy/negative/variant tests.
- `CLAUDE.md`, all eleven `.claude/rules/` files, `.githooks/`, `.gitleaks.toml`, and
  `.env.example` exist; hooks are wired via `core.hooksPath`.
- The canonical taxonomy and thresholds live only in `src/domain/types.ts` and
  `src/domain/thresholds.ts`.

**Next:** Plan 2 — Analysis Integrations (SQLite persistence, chess.com client, Stockfish
worker wrapper, engine-dependent taggers for `missesTactics`/`missesMates`/`ignoresThreats`,
the analysis pipeline, and the `/api/chess-com` + `/api/db` routes).
