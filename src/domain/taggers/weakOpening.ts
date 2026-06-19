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
