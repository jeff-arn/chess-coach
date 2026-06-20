import { test, expect } from '@playwright/test';

// Proves the real Stockfish WASM worker wires up and returns a best move for the start
// position. Generous timeout: WASM init + depth-6 search takes a few seconds.
test('stockfish worker returns a best move for the start position', async ({ page }) => {
  await page.goto('/dev/engine-smoke');
  await expect(page.getByTestId('bestmove')).not.toBeEmpty({ timeout: 20_000 });
  const best = await page.getByTestId('bestmove').textContent();
  expect(best?.trim().length ?? 0).toBeGreaterThanOrEqual(4); // e.g. "e2e4"
});
