export type PieceColor = 'white' | 'black';

export type MoveClass = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

export type GamePhase = 'opening' | 'middlegame' | 'endgame';

/**
 * The canonical weakness taxonomy. Source of truth for the whole app — the
 * analysis pipeline, curriculum module tags, and the coach all reference these.
 * Do not add synonyms elsewhere; extend this union.
 */
export type WeaknessTag =
  | 'hangsPieces'
  | 'missesTactics'
  | 'missesMates'
  | 'weakOpening'
  | 'weakEndgame'
  | 'ignoresThreats';

export const ALL_WEAKNESS_TAGS: readonly WeaknessTag[] = [
  'hangsPieces',
  'missesTactics',
  'missesMates',
  'weakOpening',
  'weakEndgame',
  'ignoresThreats',
];

export const ALL_MOVE_CLASSES: readonly MoveClass[] = [
  'best',
  'good',
  'inaccuracy',
  'mistake',
  'blunder',
];

/** One analyzed half-move played by the user. */
export type MoveAnalysis = {
  ply: number;
  fenBefore: string;
  fenAfter: string;
  san: string;
  bestSan: string;
  cpLoss: number;
  moveClass: MoveClass;
  phase: GamePhase;
  tags: WeaknessTag[];
};

export type ProfileExample = {
  fenBefore: string;
  san: string;
  bestSan: string;
};

export type WeaknessProfile = {
  totalMoves: number;
  tagFrequency: Record<WeaknessTag, number>;
  averageCpLoss: number;
  classCounts: Record<MoveClass, number>;
  examples: Record<WeaknessTag, ProfileExample[]>;
};
