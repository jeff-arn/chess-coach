'use client';

import { useState } from 'react';
import { Board } from '@/components/Board';
import type { Module } from '@/curriculum/types';

export function ModuleView({ module }: { module: Module }) {
  const [solved, setSolved] = useState(0);
  return (
    <section className="panel">
      <h1>{module.title}</h1>
      <p style={{ whiteSpace: 'pre-wrap' }}>{module.content}</p>
      {module.examplePositions[0] && <Board fen={module.examplePositions[0].fen} />}
      <h2>Practice</h2>
      {module.practice.map((p, i) => (
        <PracticeCard
          key={i}
          fen={p.fen}
          solution={p.solution}
          hint={p.hint}
          onSolved={() => setSolved((s) => s + 1)}
        />
      ))}
      <p className="muted">
        Solved {solved}/{module.completionCriteria.practiceToPass} to complete.
      </p>
    </section>
  );
}

function PracticeCard({
  fen,
  solution,
  hint,
  onSolved,
}: {
  fen: string;
  solution: string;
  hint: string;
  onSolved: () => void;
}) {
  const [status, setStatus] = useState<'idle' | 'right' | 'wrong'>('idle');
  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <Board
        fen={fen}
        onPieceDrop={(_from, to) => {
          // Compare against the solution loosely by destination; full SAN check lives in chess.js.
          const ok = solution.includes(to);
          setStatus(ok ? 'right' : 'wrong');
          if (ok) onSolved();
          return ok;
        }}
      />
      {status === 'wrong' && <p className="muted">Not quite. Hint: {hint}</p>}
      {status === 'right' && <p>Correct!</p>}
    </div>
  );
}
