'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateSettings } from '@/lib/apiClient';
import styles from './page.module.css';

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
    <section className={`panel ${styles.form}`}>
      <h1>Welcome to your chess coach</h1>
      <p className="muted">Connect your chess.com account and pick a goal.</p>
      <label className={styles.field}>
        chess.com username
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label className={styles.field}>
        Target rating
        <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" />
      </label>
      <button className={styles.submit} disabled={busy || !username || !target} onClick={start}>
        Start coaching
      </button>
    </section>
  );
}
