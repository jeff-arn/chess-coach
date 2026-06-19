import { getDb } from '@/db/connection';
import { readSettings } from '@/db/repositories/settingsRepo';
import { latestProfile } from '@/db/repositories/profilesRepo';
import { completedModuleIds } from '@/db/repositories/moduleProgressRepo';
import { upsertPlan } from '@/db/repositories/plansRepo';
import { getCatalog } from '@/curriculum/loader';
import { createCoach } from '@/coach/createCoach';

// Accepts a `Request` to match the Next.js route-handler signature, but the body
// is empty: the plan is built entirely from stored profile/settings/state.
export async function POST(req: Request): Promise<Response> {
  void req;
  const db = getDb();
  const profile = latestProfile(db);
  // A missing profile is a normal precondition (no analyzed games yet), not an error.
  if (!profile) return Response.json({ error: 'no analyzed games yet' }, { status: 409 });

  try {
    const settings = readSettings(db);
    const coach = createCoach(settings.coachBrain);
    const { plan, usedFallback } = await coach.buildPlanDetailed({
      profile,
      currentRating: null,
      targetRating: settings.targetRating,
      catalog: getCatalog(),
      completedModuleIds: completedModuleIds(db),
    });

    upsertPlan(db, plan);

    return Response.json({ plan, usedFallback });
  } catch (err) {
    console.error('coach route failed:', err);
    return Response.json({ error: 'Could not build a plan right now.' }, { status: 500 });
  }
}
