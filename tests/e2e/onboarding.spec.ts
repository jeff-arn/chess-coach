import { test, expect } from '@playwright/test';

test('onboarding saves and lands on the dashboard', async ({ page }) => {
  await page.route('**/api/db', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ json: { ok: true } })
      : route.fulfill({ json: { chesscomUsername: null, targetRating: null, coachBrain: 'claude' } }),
  );
  await page.goto('/onboarding');
  await page.getByLabel(/chess.com username/i).fill('magnus');
  await page.getByLabel(/target rating/i).fill('600');
  await page.getByRole('button', { name: /start coaching/i }).click();
  await expect(page).toHaveURL('http://localhost:3000/');
});
