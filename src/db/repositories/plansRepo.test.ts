import { describe, it, expect, afterEach } from 'vitest';
import { openDb } from '../connection';
import { upsertPlan, readPlan } from './plansRepo';
import type { Database } from 'better-sqlite3';
import type { LessonPlan } from '@/coach/types';

let db: Database;
afterEach(() => db?.close());

const makePlan = (overrides?: Partial<LessonPlan>): LessonPlan => ({
  modules: [{ moduleId: 'm1', rationale: 'start here' }],
  milestoneRationale: 'reach 700',
  ...overrides,
});

describe('plansRepo', () => {
  it('upserts a plan and reads it back unchanged', () => {
    db = openDb(':memory:');
    const plan = makePlan();
    upsertPlan(db, plan);
    expect(readPlan(db)).toEqual(plan);
  });

  it('returns null when no plan exists', () => {
    db = openDb(':memory:');
    expect(readPlan(db)).toBeNull();
  });

  it('overwrites the singleton row on a second upsert rather than inserting a new row', () => {
    db = openDb(':memory:');
    upsertPlan(db, makePlan({ milestoneRationale: 'first' }));
    upsertPlan(db, makePlan({ milestoneRationale: 'second' }));

    expect(readPlan(db)?.milestoneRationale).toBe('second');
    const count = (db.prepare('SELECT COUNT(*) AS n FROM plans').get() as { n: number }).n;
    expect(count).toBe(1);
  });
});
