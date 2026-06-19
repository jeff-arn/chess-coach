'use client';

import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '@/lib/apiClient';

export default function SettingsPage() {
  const [username, setUsername] = useState('');
  const [target, setTarget] = useState('');
  const [brain, setBrain] = useState('claude');

  useEffect(() => {
    getSettings().then((s) => {
      setUsername(s.chesscomUsername ?? '');
      setTarget(s.targetRating ? String(s.targetRating) : '');
      setBrain(s.coachBrain);
    });
  }, []);

  return (
    <section className="panel" style={{ maxWidth: 420 }}>
      <h1>Settings</h1>
      <label style={{ display: 'block', marginTop: 12 }}>
        chess.com username
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>
      <label style={{ display: 'block', marginTop: 12 }}>
        Target rating
        <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric" />
      </label>
      <label style={{ display: 'block', marginTop: 12 }}>
        Coach brain
        <select value={brain} onChange={(e) => setBrain(e.target.value)}>
          <option value="claude">Claude</option>
          <option value="rules">Rules-based</option>
        </select>
      </label>
      <button
        style={{ marginTop: 16 }}
        onClick={() => updateSettings({ chesscomUsername: username, targetRating: Number(target), coachBrain: brain })}
      >
        Save
      </button>
    </section>
  );
}
