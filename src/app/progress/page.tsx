import { getDb } from '@/db/connection';
import { listProfiles } from '@/db/repositories/profilesRepo';
import { Sparkline } from '@/components/Sparkline';

// Reads the local DB at request time — must not be statically prerendered at build.
export const dynamic = 'force-dynamic';

export default function ProgressPage() {
  const avgLoss = listProfiles(getDb()).map((p) => p.averageCpLoss);
  return (
    <section className="panel">
      <h1>Progress</h1>
      <p className="muted">Average centipawn loss over time (lower is better)</p>
      <Sparkline values={avgLoss} />
    </section>
  );
}
