import { Chess } from 'chess.js';
import { classifyMove } from '@/domain/classifyMove';
import { detectPhase } from '@/domain/detectPhase';
import type { MoveAnalysis, PieceColor, WeaknessTag } from '@/domain/types';
import { deriveTags } from './deriveTags';
import type { Engine } from '@/engine/types';

export type AnalyzeOpts = {
  engine: Engine;
  username: string;
  userColor: PieceColor;
  depth: number;
};

function uciToSan(fen: string, uci: string): string {
  if (uci.length < 4) return uci;
  const c = new Chess(fen);
  try {
    const m = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
    return m.san;
  } catch {
    return uci;
  }
}

/** Analyze every move the user played in a PGN. */
export async function analyzeGame(pgn: string, opts: AnalyzeOpts): Promise<MoveAnalysis[]> {
  const { engine, userColor, depth } = opts;
  const colorLetter = userColor === 'white' ? 'w' : 'b';

  const replay = new Chess();
  replay.loadPgn(pgn);
  const history = replay.history({ verbose: true });

  const board = new Chess();
  const out: MoveAnalysis[] = [];
  let ply = 0;

  for (const h of history) {
    ply += 1;
    const fenBefore = board.fen();
    const isUserMove = h.color === colorLetter;

    if (isUserMove) {
      const best = await engine.evaluate(fenBefore, depth);
      board.move(h.san);
      const fenAfter = board.fen();
      const after = await engine.evaluate(fenAfter, depth);
      const playedScore = -after.scoreCp;
      const cpLoss = Math.max(0, best.scoreCp - playedScore);
      const phase = detectPhase(fenBefore);
      const moveClass = classifyMove(cpLoss);

      const tags: WeaknessTag[] = deriveTags({
        fenBefore, fenAfter, san: h.san, ply, cpLoss, line: best, wasCapture: Boolean(h.captured),
      });
      if (phase === 'endgame' && (moveClass === 'mistake' || moveClass === 'blunder')) {
        if (!tags.includes('weakEndgame')) tags.push('weakEndgame');
      }

      out.push({
        ply, fenBefore, fenAfter, san: h.san, bestSan: uciToSan(fenBefore, best.bestMoveUci),
        cpLoss, moveClass, phase, tags,
      });
    } else {
      board.move(h.san);
    }
  }

  return out;
}
