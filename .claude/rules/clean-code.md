# Clean code rules

Project-specific clean-code preferences for TypeScript in this repo. For React-component-specific patterns, see `nextjs-react.md`. Where files overlap, the more specific wins (this file > `nextjs-react.md`).

## Functions

- **One job per function.** If the name needs "and," split it. *Analyze, then classify* is two functions.
- **Don't extract for extraction's sake.** A single-use helper called once and not independently testable hurts readability — inline beats extract.
- **Depth over surface.** A 150-line module that reads top-to-bottom often beats five 30-line modules with overlapping types.
- **Pure where possible, side-effecting where necessary, never both.** Compute values in one layer, do IO in another. Mixing makes testing painful.
- **Parameter count is a smell, not a hard limit.** Four is fine; six is a smell — fix it with a typed options object, not context stuffing.

## Naming

- **Names reveal intent, not implementation.** `game` beats `fetchedGameData`. `weaknesses` beats `filteredArray`.
- **Use domain language.** When the domain says *blunder*, *weakness*, *centipawn loss*, the code says so too. Don't invent generic synonyms. See `chess-domain.md` for the canonical vocabulary.
- **Length scales with scope.** A `.map` callback can be `m`. A module-level variable used across 30 lines should be `moveAnalysis`. A store field referenced from many call sites should be unambiguous on its own.
- **Verbs for functions, nouns for types and values.** `classifyMove` not `moveClassification`. `MoveAnalysis` not `MoveAnalysisData`. `isBlunder` not `blunderCheck`.
- **Prefer concrete over generic.** `games` beats `items`. `parsePgn` beats `processInput`.
- **Components**: PascalCase, noun-shaped: `GameReview`, `WeaknessHeatmap`. Hooks: camelCase starting with `use`. Services: camelCase, noun-shaped: `coachService`.

## TypeScript specifics

- **No `any`.** Use `unknown` and narrow at the boundary. Generated or third-party code is the only exception — never widen back to `any`.
- **No non-null assertions** (`!`) outside generated code. Encode presence in the type, or handle absence.
- **Prefer `type` over `interface`** unless declaration merging is genuinely needed.
- **Discriminated unions over flag-bag objects.** A coach response that is either a success or an error is two variants of a union.
- **`readonly` arrays and props by default.** Return fresh arrays; never mutate inputs.
- **`satisfies`** when you want the value's literal type preserved while checking against a wider shape.
- **Const assertions** (`as const`) on lookup tables such as `CP_LOSS_THRESHOLDS`. Tuples for fixed-shape data.

## Comments

- **Explain *why*, not *what*.** The code shows what; comments exist for context the reader cannot deduce — a workaround, a domain rule, a non-obvious tradeoff, a link to a spec.
- **Update or delete drifting comments.** A wrong comment is worse than no comment.
- **Module-level doc comments earn their keep.** A short note at the top of a file explaining the invariants it enforces saves a future reader twenty minutes.
- **No commit-message comments in code.** "Added to fix #1234" belongs in the commit, not the source.

## Avoiding over-engineering

The most common failure mode in LLM-generated code is solving problems that do not yet exist:

- **YAGNI.** Don't add a prop, generic, config option, or abstraction layer unless something in this repo uses it today.
- **No speculative abstractions.** One implementation, no factory. Concrete code is cheaper to generalize later than a wrong abstraction is to undo.
- **No premature memoization.** `memo()`, `useMemo`, `useCallback` are added when profiling shows a measurable win.
- **No defensive `undefined` returns.** If the function cannot return undefined, its type must not say it can.
- **No "just in case" `export`.** Treat the module's public surface as part of its design — the smallest set callers genuinely need.

## Lint suppressions

`// eslint-disable-next-line` and `/* eslint-disable */` are escape hatches, not workarounds.

**Before adding any new lint suppression, surface it to the user first.** State which rule you want to disable, why it is firing, and what the alternatives are. Wait for confirmation before committing the disable.

When a suppression is approved:
1. Name the rule being suppressed.
2. State why a non-suppressing alternative does not fit this specific case.
3. Scope it narrowly — `eslint-disable-next-line` over `eslint-disable`. No file-level disables without a written exception.

## When to break a rule

Every rule above has exceptions. The bar:

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.

If you cannot do all three, follow the rule.
