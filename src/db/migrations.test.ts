import { describe, it, expect, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations, MIGRATIONS } from './migrations';

let db: Database.Database;
afterEach(() => db?.close());

describe('runMigrations', () => {
  it('is idempotent — running twice applies each migration once', () => {
    db = new Database(':memory:');
    runMigrations(db);
    runMigrations(db);
    const count = db.prepare('SELECT COUNT(*) AS n FROM schema_migrations').get() as { n: number };
    expect(count.n).toBe(MIGRATIONS.length);
  });
});
