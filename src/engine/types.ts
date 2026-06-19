/** A single engine evaluation line for the side to move in a position. */
export type EngineLine = {
  bestMoveUci: string;
  scoreCp: number; // centipawns, from the side-to-move's perspective
  mate: number | null; // moves-to-mate if forced, else null
};

export interface Engine {
  evaluate(fen: string, depth: number): Promise<EngineLine>;
}
