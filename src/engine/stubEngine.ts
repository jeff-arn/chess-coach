import type { Engine, EngineLine } from './types';

const DEFAULT_LINE: EngineLine = { bestMoveUci: '0000', scoreCp: 0, mate: null };

/** Deterministic engine for tests: scripted lines keyed by FEN. */
export class StubEngine implements Engine {
  constructor(private readonly lines: Record<string, EngineLine> = {}) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async evaluate(fen: string, _depth: number): Promise<EngineLine> {
    return this.lines[fen] ?? DEFAULT_LINE;
  }
}
