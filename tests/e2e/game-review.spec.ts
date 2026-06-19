import { test, expect } from '@playwright/test';

test('game review shows the empty state with no analysis', async ({ page }) => {
  await page.goto('/review/unknown-game');
  await expect(page.getByText(/no analysis/i)).toBeVisible();
});
