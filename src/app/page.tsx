import { getDb } from '@/db/connection';
import { latestProfile } from '@/db/repositories/profilesRepo';
import { readSettings } from '@/db/repositories/settingsRepo';
import type { WeaknessProfile } from '@/domain/types';
import { DashboardSync } from './DashboardSync';

// This page reads the local per-user SQLite DB at request time, so it must never be
// statically prerendered at build time (which would open the DB during `next build`).
export const dynamic = 'force-dynamic';

export function DashboardView({
  profile,
  targetRating,
  latestRating,
}: {
  profile: WeaknessProfile | null;
  targetRating: number | null;
  latestRating: number | null;
}) {
  if (!profile) {
    return (
      <section className="panel">
        <h1>Dashboard</h1>
        <p className="muted">No analyzed games yet. Add your username in Settings, then sync.</p>
      </section>
    );
  }
  const top = Object.entries(profile.tagFrequency)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
      <section className="panel">
        <h2>Milestone</h2>
        <p>{latestRating ?? '—'} → {targetRating ?? '—'}</p>
      </section>
      <section className="panel">
        <h2>Top weaknesses</h2>
        {top.map(([tag, v]) => (
          <div key={tag}>
            <span>{tag}</span>
            <div className="bar"><i style={{ width: `${Math.round(v * 100)}%` }} /></div>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const db = getDb();
  const settings = readSettings(db);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <DashboardSync username={settings.chesscomUsername} />
      <DashboardView
        profile={latestProfile(db)}
        targetRating={settings.targetRating}
        latestRating={null}
      />
    </div>
  );
}
