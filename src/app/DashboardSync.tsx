'use client';

import { SyncButton } from '@/components/SyncButton';
import { runSync } from '@/flows/runSync';
import { StockfishEngine } from '@/engine/stockfishEngine';
import { fetchArchive } from '@/lib/apiClient';

// Fixed analysis depth for dashboard syncs; engine-analysis.md keeps depth a config
// constant rather than a magic number at the call site.
const SYNC_DEPTH = 12;

export function DashboardSync({ username }: { username: string | null }) {
  if (!username) {
    return <p className="muted">Add your chess.com username in Settings to sync games.</p>;
  }
  const user = username;

  async function onSync() {
    const now = new Date();
    const engine = new StockfishEngine();
    try {
      await runSync({
        username: user,
        engine,
        depth: SYNC_DEPTH,
        fetchGames: async () => (await fetchArchive(user, now.getFullYear(), now.getMonth() + 1)).games,
        persist: async (payload) => {
          const res = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('sync persist failed');
          return { ok: true };
        },
      });
      // The dashboard is a server component; reload so it re-reads the new profile.
      window.location.reload();
    } finally {
      engine.dispose();
    }
  }

  return <SyncButton onSync={onSync} />;
}
