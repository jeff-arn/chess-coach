import { fetchArchiveGames, fetchRapidRating } from '@/chesscom/client';

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const user = url.searchParams.get('user');
  if (!user) return Response.json({ error: 'user is required' }, { status: 400 });

  try {
    if (url.searchParams.get('stats') === '1') {
      return Response.json({ rating: await fetchRapidRating(user) });
    }
    const year = Number(url.searchParams.get('year'));
    const month = Number(url.searchParams.get('month'));
    if (!year || !month) return Response.json({ error: 'year and month required' }, { status: 400 });
    return Response.json({ games: await fetchArchiveGames(user, year, month) });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
