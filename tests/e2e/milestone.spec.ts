import { test, expect } from '@playwright/test';

test('dashboard shows the empty state with an in-memory DB and no profile', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/no analyzed games yet/i)).toBeVisible();
});
