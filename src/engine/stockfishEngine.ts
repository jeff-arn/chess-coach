'use client';

import type { Engine, EngineLine } from './types';

/**
 * Stockfish-WASM engine running in a Web Worker. Parses UCI `info`/`bestmove`
 * output. Fixed depth per call for reproducible evaluations (see
 * .claude/rules/engine-analysis.md). Browser-only. The exact worker asset path
 * is environment-dependent and is verified by Plan 4's engine-smoke E2E test.
 */
export class StockfishEngine implements Engine {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(new URL('stockfish/src/stockfish.js', import.meta.url));
    this.worker.postMessage('uci');
  }

  evaluate(fen: string, depth: number): Promise<EngineLine> {
    return new Promise((resolve) => {
      let lastScoreCp = 0;
      let lastMate: number | null = null;

      const onMessage = (e: MessageEvent<string>) => {
        const line = typeof e.data === 'string' ? e.data : '';
        const cp = line.match(/score cp (-?\d+)/);
        const mate = line.match(/score mate (-?\d+)/);
        if (cp?.[1]) lastScoreCp = Number(cp[1]);
        if (mate?.[1]) lastMate = Number(mate[1]);
        const best = line.match(/^bestmove (\S+)/);
        if (best?.[1]) {
          this.worker.removeEventListener('message', onMessage);
          resolve({ bestMoveUci: best[1], scoreCp: lastScoreCp, mate: lastMate });
        }
      };

      this.worker.addEventListener('message', onMessage);
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go depth ${depth}`);
    });
  }

  dispose(): void {
    this.worker.terminate();
  }
}
