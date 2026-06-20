import { getDb } from '@/db/connection';
import { upsertGame, type GameRow } from '@/db/repositories/gamesRepo';
import { saveAnalysis } from '@/db/repositories/analysesRepo';
import { saveProfile } from '@/db/repositories/profilesRepo';
import type { MoveAnalysis, WeaknessProfile } from '@/domain/types';

type Body = {
  games: GameRow[];
  analyses: { gameId: string; moves: MoveAnalysis[] }[];
  profile: WeaknessProfile;
};

export async function POST(req: Request): Promise<Response> {
  try {
    // Trust-boundary cast; a fuller impl would zod-validate this payload.
    const body = (await req.json()) as Body;
    const db = getDb();
    const tx = db.transaction((b: Body) => {
      for (const g of b.games) upsertGame(db, g);
      for (const a of b.analyses) saveAnalysis(db, a.gameId, a.moves);
      saveProfile(db, b.profile);
    });
    tx(body);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('sync route failed:', err);
    return Response.json({ error: 'Could not save synced games.' }, { status: 500 });
  }
}
