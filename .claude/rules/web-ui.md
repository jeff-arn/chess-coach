# Web UI rules

Accessibility, interaction design, and chess-board UX conventions.

## Accessibility baseline

- **WCAG 2.1 AA is the floor.** Every shipped page and component must meet it. AA is not aspirational; it is the default.
- **Semantic HTML first.** Use the element that describes the content: `<button>` for actions, `<nav>` for navigation, `<main>` for the page landmark, `<section>` with a heading for major content regions. Don't reach for `<div>` + `onClick` when a native element works.
- **`aria-label` or `aria-labelledby`** on every interactive control that lacks visible text. Icon-only buttons require an accessible name.
- **Focus is never trapped or lost.** Modals trap focus inside. Closing a modal returns focus to the trigger. Keyboard-only navigation must reach every interactive element in a logical order.
- **Color alone is never the only signal.** Piece color (white vs. black), move quality (blunder vs. best), and error states must be distinguishable without color — use icons, text, or shape as a secondary indicator.
- **Motion respects `prefers-reduced-motion`.** Animated board piece movement and highlight pulses are gated behind a CSS media query. Reduced-motion users get instant transitions.

## Chess board UX

- **Highlight system** uses distinct visual treatments for: last move, engine best move, selected square, legal move targets, blunder square, missed tactic. Never rely on color alone — add a subtle border or icon overlay.
- **Piece drag and click-to-move are both supported.** A user who clicks a piece then clicks a target square makes the same move as one who drags.
- **Board orientation** defaults to the user's color. A flip button is always visible. Keyboard shortcut `f` flips the board.
- **Engine lines** display in SAN notation with centipawn evaluation. Positive = white advantage, negative = black advantage. Display depth alongside the evaluation.
- **Move list** is a scrollable panel, synced to the board position. Clicking a move in the list navigates the board to that position. The current ply is highlighted.

## Review and coaching UI

- **Weakness badges** use the canonical `WeaknessTag` vocabulary from `src/domain/types.ts`. Labels are human-readable: `hangsPieces` → "Hangs pieces", `missesTactics` → "Misses tactics", etc. Never display the raw camelCase string to a user.
- **MoveClass labels** map to: `best` → "Best", `good` → "Good", `inaccuracy` → "Inaccuracy", `mistake` → "Mistake", `blunder` → "Blunder". Each class has a consistent icon and color (with a non-color secondary indicator).
- **Coach messages** are displayed in a chat-like panel. User context (their move, the best move, the centipawn loss) always precedes the explanation. Never show a raw LLM streaming chunk without buffering to a sentence boundary.
- **Loading states** are explicit: board analysis shows a spinner with "Analyzing…" text; coach responses show a typing indicator. Never leave the user looking at stale content with no feedback.

## Forms and inputs

- **Labels are visible and associated.** Every `<input>` and `<select>` has a `<label>` with a matching `htmlFor`, or an `aria-label`. Placeholder text is not a substitute for a label.
- **Validation errors appear inline**, adjacent to the field, not only in a toast at the top. Both the field and its error message are linked with `aria-describedby`.
- **PGN import** accepts paste and file upload. A drag-and-drop zone with `role="region"` and keyboard-accessible fallback input covers both paths.

## Toasts and notifications

- **Toasts are for transient, non-critical feedback** (game saved, sync complete). Errors that require action are inline, not in a toast.
- **Every toast has an `aria-live` region** so screen readers announce it. Use `aria-live="polite"` for success/info; `aria-live="assertive"` only for critical errors.
- **Toasts auto-dismiss after 5 seconds.** Errors dismiss on user action only.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.
