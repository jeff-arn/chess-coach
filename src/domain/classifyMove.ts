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
