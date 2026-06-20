'use client';

import { useState } from 'react';
import Link from 'next/link';
import { buildPlan } from '@/lib/apiClient';
import type { LessonPlan } from '@/coach/types';

export default function PlanPage() {
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [fallback, setFallback] = useState(false);

  async function build() {
    const res = await buildPlan();
    setPlan(res.plan);
    setFallback(res.usedFallback);
  }

  return (
    <section className="panel">
      <h1>Lesson Plan</h1>
      <button onClick={build}>Build my plan</button>
      {fallback && <p className="muted">Showing offline coaching (Claude was unavailable).</p>}
      <ol>
        {plan?.modules.map((m) => (
          <li key={m.moduleId}>
            <Link href={`/modules/${m.moduleId}`}>{m.moduleId}</Link> — <span className="muted">{m.rationale}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
