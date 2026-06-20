'use client';

import { useEffect, useState } from 'react';
import { StockfishEngine } from '@/engine/stockfishEngine';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export default function EngineSmokePage() {
  const [best, setBest] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let engine: StockfishEngine | null = null;
    try {
      engine = new StockfishEngine();
      engine
        .evaluate(START, 6)
        .then((line) => setBest(line.bestMoveUci))
        .catch((e) => setError(String(e)));
    } catch (e) {
      setError(String(e));
    }
    return () => engine?.dispose();
  }, []);
  return (
    <main>
      <h1>Engine smoke</h1>
      <p data-testid="bestmove">{best}</p>
      {error && <p data-testid="error">{error}</p>}
    </main>
  );
}
