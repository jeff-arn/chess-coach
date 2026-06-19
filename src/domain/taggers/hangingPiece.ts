import { Chess, type Move } from 'chess.js';
import { PIECE_VALUE } from '../pieceValues';

/**
 * True if the side to move in `fen` can win material with a capture — i.e. the
 * side that just moved left a piece hanging. Engine-free heuristic:
 *  - capturing a clearly higher-value piece is always a win (even if recaptured), or
 *  - capturing a minor-or-better piece with no recapture on that square is free
 *    (the attacker survives, so the captured piece is won outright regardless of
 *    how the attacker compares in value).
 */
export function detectHangingPiece(fen: string): boolean {
  const board = new Chess(fen);
  const captures = board
    .moves({ verbose: true })
    .filter((m): m is Move & { captured: NonNullable<Move['captured']> } => m.captured !== undefined);

  for (const cap of captures) {
    const capturedValue = PIECE_VALUE[cap.captured];
    const attackerValue = PIECE_VALUE[cap.piece];

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
