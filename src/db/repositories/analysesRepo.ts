import type { Database } from 'better-sqlite3';
import type { MoveAnalysis } from '@/domain/types';

export function saveAnalysis(db: Database, gameId: string, moves: MoveAnalysis[]): void {
  db.prepare(
    `INSERT INTO analyses (game_id, analyzed_at, moves_json) VALUES (?, ?, ?)
     ON CONFLICT(game_id) DO UPDATE SET analyzed_at=excluded.analyzed_at, moves_json=excluded.moves_json`,
  ).run(gameId, new Date().toISOString(), JSON.stringify(moves));
}

export function getAnalysis(db: Database, gameId: string): MoveAnalysis[] | null {
  const row = db.prepare('SELECT moves_json FROM analyses WHERE game_id = ?').get(gameId) as
    | { moves_json: string }
    | undefined;
  return row ? (JSON.parse(row.moves_json) as MoveAnalysis[]) : null;
}
