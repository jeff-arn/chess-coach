import { analyzeGame } from '@/analysis/analyzeGame';
import { aggregateProfile } from '@/domain/aggregateProfile';
import type { Engine } from '@/engine/types';
import type { GameRow } from '@/db/repositories/gamesRepo';
import type { MoveAnalysis, WeaknessProfile } from '@/domain/types';

export type SyncDeps = {
  username: string;
  engine: Engine;
  depth: number;
  fetchGames: () => Promise<GameRow[]>;
  persist: (payload: {
    games: GameRow[];
    analyses: { gameId: string; moves: MoveAnalysis[] }[];
    profile: WeaknessProfile;
  }) => Promise<{ ok: true }>;
  onProgress?: (done: number, total: number) => void;
};

export async function runSync(deps: SyncDeps): Promise<{ profile: WeaknessProfile }> {
  const games = await deps.fetchGames();
  const analyses: { gameId: string; moves: MoveAnalysis[] }[] = [];
  const allMoves: MoveAnalysis[] = [];

  let done = 0;
  for (const g of games) {
    try {
      const moves = await analyzeGame(g.pgn, {
        engine: deps.engine,
        username: deps.username,
        userColor: g.userColor,
        depth: deps.depth,
      });
      analyses.push({ gameId: g.id, moves });
      allMoves.push(...moves);
    } catch {
      // Skip a malformed/failed game rather than aborting the batch (engine-analysis.md).
    }
    done += 1;
    deps.onProgress?.(done, games.length);
  }

  const profile = aggregateProfile(allMoves);
  await deps.persist({ games, analyses, profile });
  return { profile };
}
