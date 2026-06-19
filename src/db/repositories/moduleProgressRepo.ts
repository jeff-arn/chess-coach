import type { Database } from 'better-sqlite3';

export function completedModuleIds(db: Database): string[] {
  const rows = db
    .prepare("SELECT module_id FROM module_progress WHERE status = 'completed'")
    .all() as { module_id: string }[];
  return rows.map((r) => r.module_id);
}
