import type { Database } from 'better-sqlite3';
import type { LessonPlan } from '@/coach/types';

export function upsertPlan(db: Database, plan: LessonPlan): void {
  db.prepare(
    `INSERT INTO plans (id, updated_at, plan_json) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, plan_json = excluded.plan_json`,
  ).run(new Date().toISOString(), JSON.stringify(plan));
}

export function readPlan(db: Database): LessonPlan | null {
  const row = db.prepare('SELECT plan_json FROM plans WHERE id = 1').get() as
    | { plan_json: string }
    | undefined;
  return row ? (JSON.parse(row.plan_json) as LessonPlan) : null;
}
