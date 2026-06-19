import type { Database } from 'better-sqlite3';

export type GameRow = {
  id: string;
  playedAt: string;
  timeControl: string | null;
  userColor: 'white' | 'black';
  result: string;
  pgn: string;
};

export function upsertGame(db: Database, g: GameRow): void {
  db.prepare(
    `INSERT INTO games (id, played_at, time_control, user_color, result, pgn)
     VALUES (@id, @playedAt, @timeControl, @userColor, @result, @pgn)
     ON CONFLICT(id) DO UPDATE SET
       played_at=excluded.played_at, time_control=excluded.time_control,
       user_color=excluded.user_color, result=excluded.result, pgn=excluded.pgn`,
  ).run(g);
}

export function listGames(db: Database, limit: number): GameRow[] {
  return db
    .prepare(
      `SELECT id, played_at AS playedAt, time_control AS timeControl,
              user_color AS userColor, result, pgn
       FROM games ORDER BY played_at DESC LIMIT ?`,
    )
    .all(limit) as GameRow[];
}
