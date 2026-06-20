'use client';

import { useState } from 'react';
import { Board } from '@/components/Board';
import type { MoveAnalysis } from '@/domain/types';
import styles from './ReviewView.module.css';

export function ReviewView({ moves }: { moves: readonly MoveAnalysis[] }) {
  const [moveIndex, setMoveIndex] = useState(0);
  const move = moves[moveIndex];
  // The guard covers both an empty list and an out-of-range index, so under
  // noUncheckedIndexedAccess we narrow `move` without a non-null assertion.
  if (!move) return <section className="panel">No analysis for this game.</section>;
  return (
    <section className="panel">
      <h1>Game Review</h1>
      <Board fen={move.fenAfter} />
      <p>
        Move {move.san} — <strong>{move.moveClass}</strong>
        {move.cpLoss > 0 && <span className="muted"> (best: {move.bestSan})</span>}
      </p>
      {move.tags.length > 0 && <p className="muted">{move.tags.join(', ')}</p>}
      <div className={styles.controls}>
        <button disabled={moveIndex === 0} onClick={() => setMoveIndex((current) => current - 1)}>
          Prev
        </button>
        <button
          disabled={moveIndex >= moves.length - 1}
          onClick={() => setMoveIndex((current) => current + 1)}
        >
          Next
        </button>
      </div>
    </section>
  );
}
