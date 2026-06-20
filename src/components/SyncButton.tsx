'use client';

import { useState } from 'react';

export function SyncButton({ onSync }: { onSync: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onSync();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? 'Syncing…' : 'Sync recent games'}
    </button>
  );
}
