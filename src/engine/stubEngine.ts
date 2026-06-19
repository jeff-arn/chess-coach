import type { Engine, EngineLine } from './types';

const DEFAULT_LINE: EngineLine = { bestMoveUci: '0000', scoreCp: 0, mate: null };

/** Deterministic engine for tests: scripted lines keyed by FEN. */
export class StubEngine implements Engine {
  constructor(private readonly lines: Record<string, EngineLine> = {}) {}
  async evaluate(fen: string): Promise<EngineLine> {
    return this.lines[fen] ?? DEFAULT_LINE;
  }
}
