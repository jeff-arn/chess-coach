import type { Settings } from '@/db/repositories/settingsRepo';
import type { GameRow } from '@/db/repositories/gamesRepo';
import type { LessonPlan } from '@/coach/types';

async function jsonGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

async function jsonPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

export const getSettings = () => jsonGet<Settings>('/api/db?kind=settings');
export const updateSettings = (patch: Partial<Settings>) =>
  jsonPost<{ ok: true }>('/api/db', { kind: 'settings', patch });
export const listGames = () => jsonGet<{ games: GameRow[] }>('/api/db?kind=games');
export const buildPlan = () => jsonPost<{ plan: LessonPlan; usedFallback: boolean }>('/api/coach', {});
export const fetchArchive = (user: string, year: number, month: number) =>
  jsonGet<{ games: GameRow[] }>(`/api/chess-com?user=${user}&year=${year}&month=${month}`);
