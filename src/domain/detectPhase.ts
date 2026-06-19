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
