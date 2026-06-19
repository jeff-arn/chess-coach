import { archiveSchema, statsSchema, USERNAME_RE } from './types';
import type { GameRow } from '@/db/repositories/gamesRepo';

const UA = 'chess-coach/0.1 (local single-user app)';
const BASE = 'https://api.chess.com/pub';

type Opts = { fetchImpl?: typeof fetch; timeoutMs?: number };

async function getJson(url: string, opts: Opts): Promise<unknown> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  try {
    const res = await fetchImpl(url, { headers: { 'User-Agent': UA }, signal: controller.signal });
    if (!res.ok) throw new Error(`chess.com ${res.status} for ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function assertUsername(user: string): void {
  if (!USERNAME_RE.test(user)) throw new Error(`invalid chess.com username: ${user}`);
}

export async function fetchArchiveGames(
  user: string, year: number, month: number, opts: Opts = {},
): Promise<GameRow[]> {
  assertUsername(user);
  const mm = String(month).padStart(2, '0');
  const json = await getJson(`${BASE}/player/${user}/games/${year}/${mm}`, opts);
  const { games } = archiveSchema.parse(json);
  const lower = user.toLowerCase();
  return games.map((g) => {
    const userColor = g.white.username.toLowerCase() === lower ? 'white' : 'black';
    const side = userColor === 'white' ? g.white : g.black;
    return {
      id: g.url,
      playedAt: new Date(g.end_time * 1000).toISOString(),
      timeControl: g.time_control ?? null,
      userColor,
      result: side.result,
      pgn: g.pgn,
    };
  });
}

export async function fetchRapidRating(user: string, opts: Opts = {}): Promise<number | null> {
  assertUsername(user);
  const json = await getJson(`${BASE}/player/${user}/stats`, opts);
  const stats = statsSchema.parse(json);
  return stats.chess_rapid?.last.rating ?? null;
}
