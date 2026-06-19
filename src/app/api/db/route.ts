import { getDb } from '@/db/connection';
import { readSettings, updateSettings } from '@/db/repositories/settingsRepo';
import { listGames } from '@/db/repositories/gamesRepo';

export async function GET(req: Request): Promise<Response> {
  const kind = new URL(req.url).searchParams.get('kind');
  const db = getDb();
  if (kind === 'settings') return Response.json(readSettings(db));
  if (kind === 'games') return Response.json({ games: listGames(db, 50) });
  return Response.json({ error: 'unknown kind' }, { status: 400 });
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as { kind: string; patch?: Record<string, unknown> };
  const db = getDb();
  if (body.kind === 'settings' && body.patch) {
    updateSettings(db, body.patch as Parameters<typeof updateSettings>[1]);
    return Response.json({ ok: true });
  }
  return Response.json({ error: 'unknown kind' }, { status: 400 });
}
