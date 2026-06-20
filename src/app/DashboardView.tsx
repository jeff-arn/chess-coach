import type { CSSProperties } from 'react';
import type { WeaknessProfile } from '@/domain/types';
import styles from './DashboardView.module.css';

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
  const weaknessFrequencies = Object.entries(profile.tagFrequency);
  const topWeaknesses = weaknessFrequencies
    .filter(([, frequency]) => frequency > 0)
    .sort(([, frequencyA], [, frequencyB]) => frequencyB - frequencyA)
    .slice(0, 3);
  return (
    <div className={styles.grid}>
      <section className="panel">
        <h2>Milestone</h2>
        <p>{latestRating ?? '—'} → {targetRating ?? '—'}</p>
      </section>
      <section className="panel">
        <h2>Top weaknesses</h2>
        {topWeaknesses.map(([tag, frequency]) => (
          <div key={tag}>
            <span>{tag}</span>
            <div className="bar">
              <i style={{ '--bar-fill': `${Math.round(frequency * 100)}%` } as CSSProperties} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
