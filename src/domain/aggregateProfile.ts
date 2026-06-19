import {
  ALL_MOVE_CLASSES,
  ALL_WEAKNESS_TAGS,
  type MoveAnalysis,
  type ProfileExample,
  type WeaknessProfile,
  type WeaknessTag,
} from './types';

const MAX_EXAMPLES_PER_TAG = 3;

/** Aggregate per-move analyses into a weakness profile. */
export function aggregateProfile(moves: MoveAnalysis[]): WeaknessProfile {
  const total = moves.length;

  const tagCounts = zeroBy(ALL_WEAKNESS_TAGS);
  const classCounts = zeroBy(ALL_MOVE_CLASSES);
  const examples = emptyExamples();
  let cpSum = 0;

  for (const m of moves) {
    cpSum += Math.max(0, m.cpLoss);
    classCounts[m.moveClass] += 1;
    for (const tag of m.tags) {
      tagCounts[tag] += 1;
      if (examples[tag].length < MAX_EXAMPLES_PER_TAG) {
        examples[tag].push({ fenBefore: m.fenBefore, san: m.san, bestSan: m.bestSan });
      }
    }
  }

  const tagFrequency = zeroBy(ALL_WEAKNESS_TAGS);
  for (const tag of ALL_WEAKNESS_TAGS) {
    tagFrequency[tag] = total === 0 ? 0 : tagCounts[tag] / total;
  }

  return {
    totalMoves: total,
    tagFrequency,
    averageCpLoss: total === 0 ? 0 : cpSum / total,
    classCounts,
    examples,
  };
}

function zeroBy<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

function emptyExamples(): Record<WeaknessTag, ProfileExample[]> {
  return Object.fromEntries(ALL_WEAKNESS_TAGS.map((t) => [t, [] as ProfileExample[]])) as Record<
    WeaknessTag,
    ProfileExample[]
  >;
}
