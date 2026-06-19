import type { Database } from 'better-sqlite3';
import type { WeaknessProfile } from '@/domain/types';

export function saveProfile(db: Database, profile: WeaknessProfile): void {
  db.prepare('INSERT INTO weakness_profiles (created_at, profile_json) VALUES (?, ?)').run(
    new Date().toISOString(),
    JSON.stringify(profile),
  );
}

export function listProfiles(db: Database): WeaknessProfile[] {
  const rows = db
    .prepare('SELECT profile_json FROM weakness_profiles ORDER BY id ASC')
    .all() as { profile_json: string }[];
  return rows.map((r) => JSON.parse(r.profile_json) as WeaknessProfile);
}

export function latestProfile(db: Database): WeaknessProfile | null {
  const row = db
    .prepare('SELECT profile_json FROM weakness_profiles ORDER BY id DESC LIMIT 1')
    .get() as { profile_json: string } | undefined;
  return row ? (JSON.parse(row.profile_json) as WeaknessProfile) : null;
}
