# Chess domain rules

Canonical vocabulary, types, and thresholds for the chess-coach domain. `src/domain/types.ts` and `src/domain/thresholds.ts` are the single source of truth. When those files and this document conflict, the TypeScript files win — update this document to match.

## Canonical types (`src/domain/types.ts`)

Do not define parallel or synonym types elsewhere in the codebase. Import from `src/domain/types.ts`.

```
PieceColor  = 'white' | 'black'

GamePhase   = 'opening' | 'middlegame' | 'endgame'

MoveClass   = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

WeaknessTag = 'hangsPieces'
            | 'missesTactics'
            | 'missesMates'
            | 'weakOpening'
            | 'weakEndgame'
            | 'ignoresThreats'
```

**Do not add synonyms.** If `WeaknessTag` needs a new variant, add it to the union in `src/domain/types.ts` and extend this document.

## MoveClass thresholds (`src/domain/thresholds.ts`)

`cpLoss` is how many centipawns worse the played move is than the engine's best move (always >= 0).

| Class       | cpLoss condition |
|-------------|-----------------|
| `best`      | cpLoss <= 10    |
| `good`      | cpLoss <= 50    |
| `inaccuracy`| cpLoss <= 100   |
| `mistake`   | cpLoss <= 200   |
| `blunder`   | cpLoss > 200    |

These are stored in `CP_LOSS_THRESHOLDS` as `{ best: 10, good: 50, inaccuracy: 100, mistake: 200 }`. The `blunder` threshold is implicit: anything above `mistake`. Classification logic must read from `CP_LOSS_THRESHOLDS`, never from hardcoded magic numbers.

## MoveAnalysis shape

One analyzed half-move played by the user:

```ts
type MoveAnalysis = {
  ply: number;         // 1-indexed half-move number
  fenBefore: string;   // FEN before the move
  fenAfter: string;    // FEN after the move
  san: string;         // played move in SAN
  bestSan: string;     // engine's best move in SAN
  cpLoss: number;      // centipawn loss >= 0
  moveClass: MoveClass;
  phase: GamePhase;
  tags: WeaknessTag[];
};
```

## WeaknessProfile shape

Aggregated weakness data across a set of games:

```ts
type WeaknessProfile = {
  totalMoves: number;
  tagFrequency: Record<WeaknessTag, number>;
  averageCpLoss: number;
  classCounts: Record<MoveClass, number>;
  examples: Record<WeaknessTag, ProfileExample[]>;
};
```

`ProfileExample` holds (fenBefore, san, bestSan) — enough for the UI to reconstruct the position.

## Naming conventions

- Use domain terms in code. The domain says *centipawn loss*, not *evaluation delta*. It says *SAN*, not *move string*. It says *blunder*, not *bad move*. Consistent naming across the codebase (domain layer, API routes, UI components, prompts) reduces cognitive overhead.
- `ply` is a half-move (one player's move). A full move consists of two plies. Use `ply` when referring to a single half-move number, `moveNumber` when referring to the chess clock's full-move count.
- Phase detection is heuristic (move count, material on board, or opening book exit). Document the heuristic used in the function that computes `GamePhase`; do not assume readers know the algorithm.

## Chess.js integration

- Use chess.js for legal move validation, SAN generation, and FEN parsing. Do not reimplement these.
- `chess.js` move objects use `.san` for the SAN string. Map directly to `MoveAnalysis.san` — no transformation.
- FEN strings from chess.js are the canonical position representation. Never use a proprietary encoding.

## Stockfish WASM integration

See `engine-analysis.md` for worker architecture and message protocol. This file covers only domain vocabulary:

- Engine evaluations are in **centipawns** from the perspective of the side to move. Normalize to absolute (white-positive) values before storing in `MoveAnalysis.cpLoss`.
- The best move from Stockfish is provided in **UCI notation** (e.g., `e2e4`, `e1g1` for castling). Convert to SAN using chess.js before storing in `MoveAnalysis.bestSan`.
- Mate scores: Stockfish reports `mate N` rather than a centipawn value. Treat a forced mate against the player as `cpLoss = 10000` for classification purposes (always a blunder if they had a mate and missed it, or could have been mated and played into it). Document this constant.

## When to break a rule

1. Name the rule you are breaking, in a code comment or PR description.
2. Explain why the alternative is worse for this specific case.
3. Be willing to defend it in review.
