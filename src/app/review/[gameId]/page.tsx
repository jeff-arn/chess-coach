import { getDb } from '@/db/connection';
import { getAnalysis } from '@/db/repositories/analysesRepo';
import { ReviewView } from './ReviewView';

// Reads the local DB at request time — must not be statically prerendered at build.
export const dynamic = 'force-dynamic';

export default async function ReviewPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  const moves = getAnalysis(getDb(), decodeURIComponent(gameId)) ?? [];
  return <ReviewView moves={moves} />;
}
