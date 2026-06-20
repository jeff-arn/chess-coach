import { getDb } from '@/db/connection';
import { latestProfile } from '@/db/repositories/profilesRepo';
import { readSettings } from '@/db/repositories/settingsRepo';
import { DashboardSync } from './DashboardSync';
import { DashboardView } from './DashboardView';
import styles from './page.module.css';

// This page reads the local per-user SQLite DB at request time, so it must never be
// statically prerendered at build time (which would open the DB during `next build`).
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const db = getDb();
  const settings = readSettings(db);
  return (
    <div className={styles.stack}>
      <DashboardSync username={settings.chesscomUsername} />
      <DashboardView
        profile={latestProfile(db)}
        targetRating={settings.targetRating}
        latestRating={null}
      />
    </div>
  );
}
