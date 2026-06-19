import type { Database } from 'better-sqlite3';

export type Settings = {
  chesscomUsername: string | null;
  targetRating: number | null;
  coachBrain: string;
};

export function readSettings(db: Database): Settings {
  const row = db
    .prepare('SELECT chesscom_username, target_rating, coach_brain FROM settings WHERE id = 1')
    .get() as { chesscom_username: string | null; target_rating: number | null; coach_brain: string };
  return {
    chesscomUsername: row.chesscom_username,
    targetRating: row.target_rating,
    coachBrain: row.coach_brain,
  };
}

export function updateSettings(
  db: Database,
  patch: Partial<{ chesscomUsername: string; targetRating: number; coachBrain: string }>,
): void {
  db.prepare(
    `UPDATE settings SET
       chesscom_username = COALESCE(@chesscomUsername, chesscom_username),
       target_rating = COALESCE(@targetRating, target_rating),
       coach_brain = COALESCE(@coachBrain, coach_brain)
     WHERE id = 1`,
  ).run({
    chesscomUsername: patch.chesscomUsername ?? null,
    targetRating: patch.targetRating ?? null,
    coachBrain: patch.coachBrain ?? null,
  });
}
