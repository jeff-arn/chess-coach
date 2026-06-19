# Testing rules

Strict testing discipline applies regardless of phase. Not negotiable.

## What "tested" means

A function, hook, component, or flow is tested when it has:

1. At least one happy-path test confirming it does what its name says.
2. At least one negative-path test confirming it fails correctly on bad input.
3. Variant coverage for every meaningfully distinct input class. "It works for one input" is not coverage.

Snapshot tests do not count as coverage on their own. They confirm output has not changed, not that it is correct. Acceptable as a regression guard alongside real assertions, never instead.

## When a test fails

A failing test is a finding, not a chore. Investigate before rewriting.

1. Read what the test is asserting and what actually happened.
2. Decide whether the production code is wrong or the test is wrong.
3. If the production code is wrong, fix the production code. Do not weaken the assertion.
4. If the test is wrong, fix the test and add a comment explaining what the original assertion intended and why the new version is correct.
5. If you cannot tell which is wrong, stop and ask before changing either.

Never delete a failing test to "clean up" without an explicit, documented reason.

## Layers

Three layers, each with a clear remit. A behavior is owned by exactly one of them.

### Unit (Vitest)

- Pure utilities, parsers, classifiers, domain functions (`classifyMove`, weakness detection logic, CP_LOSS_THRESHOLDS consumers), and custom hooks via `@testing-library/react`'s `renderHook`.
- No DOM rendering beyond what `renderHook` requires. No HTTP. No Stockfish.
- Live next to the file under test as `<thing>.test.ts` or `<thing>.test.tsx`.

### Component (Vitest + React Testing Library)

- User-visible behavior of components and small feature units.
- **Query by role and accessible name** (`getByRole('button', { name: /flip board/i })`), never by `data-testid` unless there is no semantic handle. If you need a testid, the component is probably under-accessible — fix that first.
- Use `userEvent` (not `fireEvent`) for interactions. Async events use `await userEvent.*` and `findBy*` queries.
- Assert on what the user perceives (text, role, announced state), not on internal state or implementation details.

### End-to-end (Playwright)

One test per critical user journey. The five canonical journeys that must always have coverage:

1. **Onboarding → first sync**: user lands, enters chess.com username, syncs games, sees first game in list.
2. **Game review**: user opens a game, board populates, engine analysis runs, blunders are highlighted, coach explanation appears.
3. **Module flow**: user opens a curriculum module matched to a weakness, steps through it, completes it, sees progress update.
4. **Re-sync → milestone**: user re-syncs after playing new games, weakness profile updates, a milestone notification fires.
5. **Coach fallback**: ANTHROPIC_API_KEY is absent/invalid; coach falls back to rule-based explanation; no crash, no raw error shown to user.

Run against a Next.js dev or preview build. Stub external HTTP with Playwright's `page.route(...)` serving fixtures from `src/test/fixtures/`. Stockfish is stubbed via a lightweight mock worker for determinism; one dedicated smoke test lets the real engine run to catch WASM regressions. The real Stockfish WASM may run in that smoke test — it is a browser bundle, not a network dependency.

## Mocking

There is exactly one mock seam per external dependency: the client module itself.

- **E2E (Playwright)**: intercept at the network layer with `page.route(...)` serving JSON fixtures from `src/test/fixtures/`. This replaces both the chess.com API and the Anthropic API responses without touching application code.
- **Unit / component (Vitest)**: mock the chess.com and Claude **client modules** (`src/lib/chesscom/client.ts`, `src/lib/coach/client.ts`) via `vi.mock(...)`. These are the single seam — mock nothing else for external HTTP. Every `vi.mock(...)` call requires a comment explaining why a real implementation is inappropriate for the test.
- **Never** mock `fetch` directly or monkeypatch `XMLHttpRequest`. They drift from production behavior and bypass the typed client boundary.
- **Stockfish WASM**: use a lightweight mock worker in unit/component tests; one dedicated smoke test runs the real worker to guard against WASM regressions.
- Time: `vi.useFakeTimers()` for tests that depend on timers, with explicit advance and reset.

## What to test

- **Domain functions**: every branch — especially `classifyMove` against each `CP_LOSS_THRESHOLDS` boundary.
- **Hooks**: every state transition + every observable side effect.
- **API routes**: happy path + validation failure + upstream-error path. Use `vitest` with `next/test-utils` or direct `Request`/`Response` construction; no actual HTTP server needed for unit tests.
- **Coach**: happy path (LLM response), fallback path (no API key), streaming partial-output path.
- **Components**: every meaningful interaction (click, keyboard, form submit) and every visible state (loading, error, empty, populated).

## What not to test

- Generated types or schema files.
- Pure data structures with no behavior.
- Trivial wrappers that only forward to a tested function.
- Third-party library internals (chess.js, Stockfish, Anthropic SDK).
- React's own behavior (`useState` updating state).
- Visual styling for its own sake.

## Test naming

- **Unit / hooks**: `it('classifies a move as blunder when cpLoss exceeds 200', ...)`. The name reads as a sentence.
- **Components**: `it('shows the blunder badge when the played move is a blunder', ...)`.
- **E2E**: `<journey>_<scenario>` — e.g., `game_review_highlights_blunder`, `coach_falls_back_when_key_absent`.
- Generic names like `test_foo` or `it('works')` are not acceptable.

## Test data

- Fixtures live in `src/test/fixtures/` as TypeScript modules typed against domain types.
- Game and move fixtures are a small representative subset — not a full game dump. Each fixture file has a top comment explaining what scenarios it covers.
- Don't share mutable fixture objects across tests. Export factory functions (`makeMoveAnalysis(overrides?)`) that return fresh objects.

## Coverage

Coverage is a tool for finding gaps, not a target to game. The CI surface is a readable coverage report plus failing tests when meaningful coverage drops on changed files. Don't add tests to hit a number; don't delete tests because coverage allows it.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.
