# Engine analysis rules

Conventions for Stockfish WASM integration, the analysis pipeline, and move classification.

## Worker architecture

- **Stockfish WASM runs exclusively in a Web Worker.** Never import or instantiate Stockfish in the main thread. The main thread communicates with the worker via `postMessage` / `onmessage`.
- One worker instance per browser tab. Create it lazily on first analysis request; keep it alive for the session. Do not spawn a new worker per game or per move.
- The worker is wrapped in a typed service (`src/engine/stockfishWorker.ts` or similar) that encapsulates the UCI protocol. Call sites interact with the service, not with raw `postMessage` calls.
- Clean up the worker on page unload (`beforeunload` event or equivalent Next.js cleanup). Leaving orphaned workers wastes memory and CPU.

## UCI protocol

- Initialize with `uci` command; wait for `uciok` before sending positions.
- Set options once after `uciok`. Minimum required: `setoption name Threads value 1` (single-threaded for WASM), `setoption name Hash value 16` (small hash for browser).
- Send positions as `position fen <fen>` followed by `go depth <N>` or `go movetime <ms>`. Do not use `position startpos moves ...` for mid-game positions — always use the absolute FEN.
- Parse `info depth ... score cp <N> pv <move>` lines to extract evaluations. Capture the best line from the deepest `info` line received before `bestmove`.
- `bestmove` signals analysis complete. Do not treat intermediate `info` lines as final.

## Analysis depth and timing

- Default depth: 18. Adjustable via user settings or environment config; do not hardcode 18 at call sites — read from a config constant.
- Movetime cap: 3000 ms per position. Analysis stops at whichever comes first: depth 18 or 3 seconds.
- For batch analysis (full game review), analyze positions sequentially, not in parallel. Parallelism would require multiple workers and is not worth the complexity for this use case.
- Show a per-move progress indicator during batch analysis. The user should see which move is being analyzed and how many remain.

## Score normalization

- Stockfish centipawn scores are from the perspective of the side to move. Normalize to **white-positive** before storing: if it is black's move, multiply the score by -1.
- Mate scores (`score mate N`): convert to a large centipawn value for storage. Use `+30000` for a forced mate in favor of the side to move, `-30000` against. Document this sentinel in the code.
- `cpLoss` in `MoveAnalysis` is always >= 0: `max(0, engineScoreBefore - engineScoreAfter)` (both normalized to white-positive, from the player's perspective). A move that accidentally improves the position (engine noise at shallow depth) clamps to 0, not negative.

## Move classification pipeline

The pipeline for a single game:

1. Walk moves in order. For each ply:
   a. Record `fenBefore`.
   b. Play the user's move; record `fenAfter` and `san`.
   c. Run Stockfish on `fenBefore` to get `engineScoreBefore` and `bestMove` (bestSan after UCI-to-SAN conversion).
   d. Run Stockfish on `fenAfter` to get `engineScoreAfter`.
   e. Compute `cpLoss` and classify via `CP_LOSS_THRESHOLDS`.
   f. Detect `GamePhase` and assign `WeaknessTag[]`.
   g. Emit a `MoveAnalysis` record.
2. Aggregate all records into a `WeaknessProfile`.

Steps c and d require two Stockfish evaluations per ply. Cache evaluations by FEN to avoid re-evaluating the same position (transpositions, repeated positions).

## Tagging logic

Weakness tags are derived heuristically from move and position data:

- `hangsPieces`: the played move left a piece en prise (attackedBy count > 0, not defended). Engine score drops significantly.
- `missesTactics`: a tactic existed (fork, pin, skewer, discovered attack) on `fenBefore` that the user did not play; `bestSan` exploits it.
- `missesMates`: Stockfish's best line includes a forced mate in N that the user did not find.
- `weakOpening`: `phase === 'opening'` and `moveClass` is `inaccuracy` or worse, or development principles violated (piece moved twice before castling, pawns moved aimlessly).
- `weakEndgame`: `phase === 'endgame'` and `moveClass` is `inaccuracy` or worse.
- `ignoresThreats`: the opponent had a strong threat on the previous move; the user's response did not address it.

Tag detection logic lives in `src/engine/tagger.ts`. It is unit-tested against known positions — do not embed it in the analysis pipeline function itself.

## Error handling

- If Stockfish fails to initialize (WASM not supported, memory allocation failure), surface a clear message to the user and disable the analysis feature gracefully. Do not crash the page.
- If a single position times out (no `bestmove` within 10 seconds), log a warning, skip that ply, and continue batch analysis. Mark the move as unclassified rather than erroring the whole game.
- Stale analysis workers (no response for 15 seconds) are terminated and a fresh worker is created.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.
