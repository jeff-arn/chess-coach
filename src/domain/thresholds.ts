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
