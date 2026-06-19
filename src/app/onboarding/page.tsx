'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSettings } from '@/lib/apiClient';

export default function OnboardingPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    await updateSettings({ chesscomUsername: username, targetRating: Number(target) });
    router.push('/');
  }

  return (
    <section className="panel" style={{ maxWidth: 420 }}>
      <h1>Welcome to your chess coach</h1>
      <p className="muted">Connect your chess.com account and pick a goal.</p>
      <label style={{ display: 'block', marginTop: 12 }}>
        chess.com username
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label style={{ display: 'block', marginTop: 12 }}>
        Target rating
        <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" />
      </label>
      <button style={{ marginTop: 16 }} disabled={busy || !username || !target} onClick={start}>
        Start coaching
      </button>
    </section>
  );
}
