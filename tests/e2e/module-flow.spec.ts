import { test, expect } from '@playwright/test';

test('a curriculum module renders its lesson and practice', async ({ page }) => {
  await page.goto('/modules/dont-hang-pieces');
  await expect(page.getByRole('heading', { name: /stop giving away pieces/i })).toBeVisible();
  await expect(page.getByText(/practice/i)).toBeVisible();
});
